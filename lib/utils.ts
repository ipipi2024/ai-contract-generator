export function canUserCreateContract(user: any): boolean {
  const now = new Date();
  const lastReset = new Date(user.planLimits?.lastResetDate || Date.now());

  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    user.contractsCreated = 0;
    if (user.planLimits) user.planLimits.lastResetDate = now;
  }

  const limits: Record<string, number> = {
    free: 5,
    pro: 50,
    enterprise: Infinity
  };

  return user.contractsCreated < limits[user.plan];
}
