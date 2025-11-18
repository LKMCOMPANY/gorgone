# Vercel Environment Variable Setup

**CRITICAL**: Add this variable in Vercel Dashboard

## Variable to Add

```
Name: AI_GATEWAY_API_KEY
Value: vck_1psIKt309YsaNFHUrSWorKn6iJNteykoPZ446F3Av8yJc4TWHB1PXg0x
Environments: ✅ Production, ✅ Preview, ✅ Development
```

## How to Add

1. Go to: https://vercel.com
2. Select project: Gorgone
3. Go to: Settings
4. Click: Environment Variables (left menu)
5. Click: "Add New"
6. Fill in:
   - Name: `AI_GATEWAY_API_KEY`
   - Value: `vck_1psIKt309YsaNFHUrSWorKn6iJNteykoPZ446F3Av8yJc4TWHB1PXg0x`
   - Check all 3 environments
7. Click: Save

## Verification

After adding, redeploy the `analysis` branch to pick up the variable.

The SDK Vercel AI will automatically use AI Gateway instead of direct OpenAI!
