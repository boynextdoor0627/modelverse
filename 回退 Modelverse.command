#!/bin/zsh
set -euo pipefail

SERVER="modelverse@121.43.255.76"
KEY_FILE="$HOME/.ssh/modelverse_deploy_ed25519"
SSH=(ssh -i "$KEY_FILE" -o IdentitiesOnly=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)

finish() {
  echo
  echo "按任意键关闭窗口…"
  read -k 1
}
trap finish EXIT

echo "Modelverse 回退上一个版本"
echo "────────────────────────"

"${SSH[@]}" "$SERVER" 'bash -s' <<'REMOTE_SCRIPT'
set -euo pipefail
current="$(readlink -f /home/modelverse/current || true)"
previous="$(readlink -f /home/modelverse/previous || true)"
if [[ -z "$previous" || ! -d "$previous" ]]; then
  echo "没有可回退的上一版本。"
  exit 1
fi
ln -sfn "$current" /home/modelverse/previous.next
mv -Tf /home/modelverse/previous.next /home/modelverse/previous
ln -sfn "$previous" /home/modelverse/current.next
mv -Tf /home/modelverse/current.next /home/modelverse/current
sudo /usr/bin/systemctl restart modelverse
curl -fsS http://127.0.0.1:3000/ >/dev/null
echo "已恢复上一版本：https://modelverse.tech"
REMOTE_SCRIPT
