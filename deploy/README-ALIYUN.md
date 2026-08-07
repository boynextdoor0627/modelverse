# Modelverse：Alibaba Cloud Linux 部署说明

目标域名：`modelverse.tech`  
应用目录：`/var/www/modelverse`  
应用内部端口：`127.0.0.1:3000`

## 1. 阿里云控制台

1. 给 `modelverse.tech` 添加 A 记录，主机记录为 `@`，记录值为 ECS 公网 IP。
2. 给 `www.modelverse.tech` 添加 CNAME 记录，记录值为 `modelverse.tech`。
3. ECS 安全组只需放行 TCP 80 和 443。SSH 22 建议仅允许自己的固定 IP。不要放行 3000。

## 2. 安装运行环境

登录 ECS 后执行：

```bash
sudo dnf update -y
sudo dnf install -y nginx tar xz curl
```

本项目需要 Node.js 22.13 或更高版本。请从 Node.js 官方下载页选择 Linux x64（普通 Intel/AMD ECS）或 Linux ARM64（倚天 ARM ECS）的 Node.js 22 安装包。安装完成后确认：

```bash
node --version
npm --version
sudo npm install -g pnpm@10
pnpm --version
```

## 3. 创建专用账户和目录

```bash
sudo useradd --system --create-home --shell /sbin/nologin modelverse
sudo mkdir -p /var/www/modelverse
sudo chown -R modelverse:modelverse /var/www/modelverse
```

将 Mac 上 `Modelverse` 文件夹中的项目文件上传到 `/var/www/modelverse`。不要上传 `node_modules`、`.next`、`dist` 和本地缓存。

## 4. 安装并构建网站

```bash
cd /var/www/modelverse
sudo -u modelverse pnpm install --frozen-lockfile
sudo -u modelverse pnpm build
```

## 5. 注册后台服务

```bash
sudo cp /var/www/modelverse/deploy/modelverse.service /etc/systemd/system/modelverse.service
sudo systemctl daemon-reload
sudo systemctl enable --now modelverse
sudo systemctl status modelverse
```

如果需要查看网站日志：

```bash
sudo journalctl -u modelverse -n 100 --no-pager
```

## 6. 启用域名访问

先启用 HTTP 配置：

```bash
sudo cp /var/www/modelverse/deploy/modelverse-http.nginx.conf /etc/nginx/conf.d/modelverse.conf
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

DNS 生效后，访问 `http://modelverse.tech` 检查网站。

## 7. 启用 HTTPS

在阿里云数字证书管理服务中申请或上传证书，选择部署到当前 ECS/Nginx。若手动安装，将证书放到 `/etc/nginx/ssl/`，然后参照 `modelverse-https.nginx.conf.example` 修改证书实际路径并替换当前 Nginx 配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

最后检查：

- `https://modelverse.tech`
- `https://www.modelverse.tech`
- HTTP 是否自动跳转到 HTTPS
- Logo、背景音乐、模型详情页和中英文切换是否正常

## 日后更新网站

上传新文件后执行：

```bash
cd /var/www/modelverse
sudo -u modelverse pnpm install --frozen-lockfile
sudo -u modelverse pnpm build
sudo systemctl restart modelverse
```
