#!/bin/zsh
set -euo pipefail

PROJECT_DIR="${0:A:h}"
SERVER="modelverse@121.43.255.76"
KEY_FILE="$HOME/.ssh/modelverse_deploy_ed25519"
RELEASE_ID="$(date -u +%Y%m%d-%H%M%S)"
REMOTE_RELEASE="/home/modelverse/releases/$RELEASE_ID"
SSH=(ssh -i "$KEY_FILE" -o IdentitiesOnly=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)

finish() {
  echo
  echo "按任意键关闭窗口…"
  read -k 1
}
trap finish EXIT

echo "Modelverse 一键发布"
echo "────────────────────────"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "未找到 Modelverse 发布密钥，请先完成一次性服务器配置。"
  exit 1
fi

echo "1/4 连接服务器…"
"${SSH[@]}" "$SERVER" "mkdir -p '$REMOTE_RELEASE'"

echo "2/4 上传本次版本…"
rsync -az \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='.vinext' \
  --exclude='.wrangler' \
  --exclude='.pnpm-store' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='work' \
  --exclude='sources' \
  --exclude='.DS_Store' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.key' \
  --exclude='*.tar.gz' \
  --exclude='*.command' \
  -e "ssh -i '$KEY_FILE' -o IdentitiesOnly=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new" \
  "$PROJECT_DIR/" "$SERVER:$REMOTE_RELEASE/"

echo "3/4 在服务器安全构建…"
"${SSH[@]}" "$SERVER" "bash -s" -- "$REMOTE_RELEASE" <<'REMOTE_SCRIPT'
set -euo pipefail
release="$1"
export PATH=/usr/local/bin:/usr/bin:/bin
cd "$release"
pnpm install --frozen-lockfile
pnpm build

previous="$(readlink -f /home/modelverse/current || true)"
if [[ -n "$previous" ]]; then
  ln -sfn "$previous" /home/modelverse/previous.next
  mv -Tf /home/modelverse/previous.next /home/modelverse/previous
fi
ln -sfn "$release" /home/modelverse/current.next
mv -Tf /home/modelverse/current.next /home/modelverse/current
sudo /usr/bin/systemctl restart modelverse

healthy=0
for attempt in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:3000/ >/dev/null; then healthy=1; break; fi
  sleep 1
done

if [[ "$healthy" != "1" ]]; then
  if [[ -n "$previous" ]]; then
    ln -sfn "$previous" /home/modelverse/current.next
    mv -Tf /home/modelverse/current.next /home/modelverse/current
    sudo /usr/bin/systemctl restart modelverse
  fi
  echo "新版本健康检查失败，已恢复上一版本。"
  exit 1
fi
REMOTE_SCRIPT

echo "4/4 检查公网网站…"
if curl -fsS --max-time 20 https://modelverse.tech/ >/dev/null; then
  echo "────────────────────────"
  echo "发布成功：https://modelverse.tech"
else
  echo "服务器内发布成功，但公网检查暂时未通过，请稍后刷新网站。"
fi
