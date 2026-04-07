# 🚀 阿里云自动化部署配置指南 (ACR + SAE)

您的项目现已配置为通过 **阿里云** 自动部署。一旦配置完成，推送到 `main` 分支的代码将自动构建并上线。

## 🔹 第一步：准备阿里云环境

1.  **容器镜像服务 (ACR)**:
    *   进入 [ACR 控制台](https://cr.console.aliyun.com/)。
    *   创建一个 **命名空间** (例如 `racing-game`)。
    *   创建一个 **镜像仓库** (仓库名称设为 `speed-racing`, 设为私有)。
    *   **重要**: 在 `个人实例 > 设置固定密码` 中设置一个 **独立登录密码** (ACR_PASSWORD)。
2.  **Serverless 应用引擎 (SAE)**:
    *   进入 [SAE 控制台](https://sae.console.aliyun.com/)。
    *   创建一个新应用 (选择“代码包/镜像部署”，并关联上述 ACR 镜像)。
    *   记下应用的 **App ID**。
3.  **RAM 访问控制 (身份认证)**:
    *   创建一个 RAM 用户 (勾选“OpenAPI 调用访问”)。
    *   为该用户授予以下权限：
        *   `AliyunACRFullAccess`
        *   `AliyunSAEFullAccess`
    *   保存生成的 `AccessKey ID` 和 `AccessKey Secret`。

## 🔹 第二步：配置 GitHub Secrets

在您的 GitHub 仓库 `Settings > Secrets and variables > Actions` 中添加以下变量：

| 变量名 | 内容例举 | 说明 |
| :--- | :--- | :--- |
| **ALIBABA_CLOUD_ACCESS_KEY_ID** | `LTAI...` | RAM 用户 AK |
| **ALIBABA_CLOUD_ACCESS_KEY_SECRET** | `ab12...` | RAM 用户 SK |
| **ACR_REGISTRY** | `registry.cn-hangzhou.aliyuncs.com` | 您的 ACR 实例地址 |
| **ACR_NAMESPACE** | `racing-game` | ACR 命名空间 |
| **ACR_USERNAME** | `your_aliyun_name` | 阿里云用户名 |
| **ACR_PASSWORD** | `******` | **ACR 独立登录密码** |
| **SAE_APP_ID** | `xxxx-xxxx-xxxx` | SAE 应用 ID |

## 🔹 第三步：推送触发

```bash
git add .
git commit -m "deploy: switch to aliyun infrastructure"
git push origin main
```

---

> [!IMPORTANT]
> **关于网络**: 
> - SAE 部署时默认使用内网拉取镜像，请确保 SAE 应用和 ACR 仓库在同一地域。
> - 部署成功后，您需要手动在 SAE 的 **“访问设置”** 中配置公网 SLB (负载均衡) 才能从外部访问游戏。
