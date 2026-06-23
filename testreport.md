# Test Report

## 基本信息

- 项目：CAU 校园二手交易小程序
- 分支：feature/update-backend
- 日期：2026-06-23
- 测试环境：Windows + Docker Compose + WeChat DevTools
- 后端地址：http://localhost:8080

## 本次修改范围

1. 修复 L2 高级认证流程
   - L2 不再由用户输入学号后直接升级。
   - 用户需提交真实姓名、学号、学生证/证件照片。
   - 后端保存 L2 认证申请，状态为 Pending。
   - 管理员在后台审核通过后，用户才升级为 L2。
   - 管理员可驳回申请并填写原因。

2. 新增 L2 认证审核后台
   - 管理后台新增“认证审核”tab。
   - 仪表盘新增待审认证数量。
   - 管理员可查看申请人邮箱、姓名、学号和证件照片。
   - 审核通过后写入用户 StudentId，并刷新用户 AuthLevel 至 L2。

3. 修复管理员身份识别
   - 登录响应新增 roleType 字段。
   - 前端可正确识别管理员并显示管理后台入口。

4. 修复安全密码功能
   - 安全密码保持为独立的 6 位数字密码，不再和登录密码混用。
   - 新增安全密码重置接口：POST /api/v1/auth/reset-security-password。
   - 重置安全密码要求用户已登录且达到 L1，并使用当前账号绑定邮箱的验证码。
   - 小程序认证页新增“重置安全密码”表单。
   - 账号设置 ActionSheet 新增“重置安全密码”入口。

5. 其他前端修复
   - 注册入口不再错误跳转到登录后操作提示。
   - 忘记密码入口跳转到重置登录密码流程。
   - 已完成 L1 时，邮箱认证页不再继续展示绑定邮箱表单。

## 自动化/命令行验证

### 1. 前端 JS 语法检查

执行命令：

```powershell
node --check miniprogram\pages\register\register.js
node --check miniprogram\pages\admin\admin.js
node --check miniprogram\pages\my\my.js
node --check miniprogram\api\auth.js
node --check miniprogram\api\admin.js
```

结果：全部通过，无语法错误。

### 2. 后端 Docker 构建

执行命令：

```powershell
docker compose build api
```

结果：构建成功。

备注：构建过程中存在 EF Core 迁移文件的 CA1861 性能建议 warning，不影响编译和运行。

### 3. 后端容器启动

执行命令：

```powershell
docker compose up -d api
docker compose logs api --tail 40
```

结果：API 容器启动成功，监听 http://0.0.0.0:8080。

### 4. 数据库迁移验证

执行命令：

```powershell
docker compose exec -T mysql mysql -uroot -pdevpassword -D cau_second_hand -e "SHOW TABLES LIKE 't_student_verification_application';"
docker compose exec -T mysql mysql -uroot -pdevpassword -D cau_second_hand -e "SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId;"
```

结果：

- t_student_verification_application 表已创建。
- 20260623093000_AddStudentVerificationApplications 已记录到 __EFMigrationsHistory。

### 5. L2 认证接口鉴权验证

执行命令：

```powershell
Invoke-WebRequest -Uri 'http://localhost:8080/api/v1/auth/student-verification' -UseBasicParsing
Invoke-WebRequest -Uri 'http://localhost:8080/api/v1/admin/verifications' -UseBasicParsing
```

结果：未登录访问均返回 401，符合预期。

使用 L1 测试用户登录后查询：

```powershell
POST /api/v1/auth/login
GET /api/v1/auth/student-verification
```

结果：返回 code=0，data.status=None，authLevel=1，符合预期。

使用管理员测试用户登录后查询：

```powershell
POST /api/v1/auth/login
GET /api/v1/admin/verifications
```

结果：返回 code=0，待审核列表可正常返回，符合预期。

### 6. 安全密码重置接口验证

未登录请求：

```powershell
POST /api/v1/auth/reset-security-password
```

结果：返回 401，符合预期。

L1 用户登录后使用错误验证码请求：

```powershell
POST /api/v1/auth/reset-security-password
```

结果：返回 400，符合预期。

## 需要手工回归的微信开发者工具场景

1. L1 用户进入“账号设置”
   - 可看到“设置安全密码”。
   - 可看到“重置安全密码”。

2. 设置安全密码
   - 输入非 6 位数字应被前端拦截。
   - 两次输入不一致应被前端拦截。
   - 已设置过安全密码时，后端提示“已设置过安全密码”。

3. 重置安全密码
   - 输入绑定邮箱并发送验证码。
   - 验证码错误时提示失败。
   - 验证码正确时安全密码重置成功。
   - 输入非当前账号绑定邮箱时，后端应拒绝。

4. L2 高级认证
   - L1 用户可上传学生证/证件照片并提交审核。
   - 提交后状态显示“审核中”。
   - 管理员后台“认证审核”tab 可以看到申请。
   - 管理员通过后，用户刷新认证状态应升级为 L2。
   - 管理员驳回后，用户页面应展示驳回原因并允许重新提交。

## 结论

本次修改的后端构建、容器启动、数据库迁移和核心接口鉴权均已通过命令行验证。微信端 UI 流程已完成代码接入，建议在微信开发者工具中按上述手工场景再做一次完整回归后提交分支。