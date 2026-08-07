# Modelverse Mac 一键发布：一次性服务器配置

下面的初始化只需要执行一次。完成后，日常更新不再需要进入阿里云 Workbench。

## 安全组

为 ECS 入方向增加 TCP 22，来源仅填写当前 Mac 所在网络的公网 IPv4，并使用 `/32` 掩码。不要设置为 `0.0.0.0/0`。

## Workbench 初始化

以 root 登录 Workbench，执行：

```bash
usermod -s /bin/bash modelverse
mkdir -p /home/modelverse/.ssh /home/modelverse/releases
grep -qxF 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIArpgu3+wIKYhtaOl0DWNNhhtpbduXJIBWOA9HOSQz/H modelverse-deploy' /home/modelverse/.ssh/authorized_keys 2>/dev/null || echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIArpgu3+wIKYhtaOl0DWNNhhtpbduXJIBWOA9HOSQz/H modelverse-deploy' >> /home/modelverse/.ssh/authorized_keys
chown -R modelverse:modelverse /home/modelverse
chmod 700 /home/modelverse/.ssh
chmod 600 /home/modelverse/.ssh/authorized_keys
ln -sfn /var/www/modelverse /home/modelverse/current
ln -sfn /var/www/modelverse /home/modelverse/previous
printf '%s\n' 'modelverse ALL=(root) NOPASSWD: /usr/bin/systemctl restart modelverse' > /etc/sudoers.d/modelverse-deploy
chmod 440 /etc/sudoers.d/modelverse-deploy
visudo -cf /etc/sudoers.d/modelverse-deploy
sed -i 's#^WorkingDirectory=.*#WorkingDirectory=/home/modelverse/current#' /etc/systemd/system/modelverse.service
systemctl daemon-reload
systemctl restart modelverse
systemctl status modelverse --no-pager
```

最后应看到 `active (running)` 和 `parsed OK`。

## 日常使用

双击项目根目录中的 `发布 Modelverse.command`。若新版本有问题，双击 `回退 Modelverse.command`。
