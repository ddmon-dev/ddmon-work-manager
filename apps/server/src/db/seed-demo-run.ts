import { seedDemo } from "./seed-demo";

// CLI 전용 러너 (npm run db:seed-demo). 배포 환경에서는 bootstrap.ts가 seedDemo를 호출한다.
seedDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("데모 시딩 실패:", err);
    process.exit(1);
  });
