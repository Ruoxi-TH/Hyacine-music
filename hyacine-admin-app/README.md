# 风堇音乐管理后台

基于 Next.js 的风堇音乐服务端管理后台。

## 功能

- 管理员登录
- 用户列表查看
- 用户封禁/解封
- 用户删除
- 权限管理
- 数据统计

## 环境要求

- Node.js 20+
- pnpm 10+

## 配置

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## 开发

```bash
pnpm install
pnpm dev
```

访问 http://localhost:3000

## 构建

```bash
pnpm build
pnpm start
```

## 使用

1. 首先通过 CLI 创建管理员账号：
   ```bash
   ./hyacine-cli create-admin admin admin@example.com yourpassword
   ```

2. 启动后台服务

3. 访问管理后台，使用管理员账号登录

## 安全建议

- 不要将管理后台暴露到公网
- 使用强密码
- 定期更换 JWT Secret
- 配置防火墙限制访问