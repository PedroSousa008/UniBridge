import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('grep -rl "session.user.id" src/app/api/company src/app/company 2>/dev/null || true', {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean);

const skip = /profile\/(me|password|ecosystem)|profile\/team|profile\/partnerships/;

for (const f of files) {
  if (skip.test(f)) continue;
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes("requireSession('COMPANY')") && !c.includes('requireCompanyWorkspace')) continue;
  if (c.includes('getCompanyWorkspaceUserId')) continue;
  if (c.includes("from '@/lib/session'")) {
    c = c.replace(
      "import { requireSession } from '@/lib/session';",
      "import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';"
    );
    c = c.replace(
      "import { requireCompanyWorkspace } from '@/lib/session';",
      "import { getCompanyWorkspaceUserId, requireCompanyWorkspace } from '@/lib/session';"
    );
  }
  c = c.replace(/session\.user\.id/g, 'getCompanyWorkspaceUserId(session)');
  fs.writeFileSync(f, c);
  console.log('updated', f);
}
