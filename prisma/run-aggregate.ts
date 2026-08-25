// Runner local da agregação de retenção: `npm run db:aggregate`.
import { aggregateRetention } from "../src/lib/telemetry/aggregate";

aggregateRetention()
  .then((r) => {
    console.log("Agregação concluída:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
