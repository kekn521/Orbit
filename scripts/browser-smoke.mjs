import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}),
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
mkdirSync('test-results', { recursive: true });
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const waitSaved = () => page.getByRole('dialog').waitFor({ state: 'hidden' });
const suffix = Date.now();
const title = `Browser smoke task ${suffix}`;
const projectName = `Browser smoke project ${suffix}`;
const created = [];
const locateRecord = async (resource, key, value) => {
  const entries = await (await page.request.get(`${base}/api/${resource}`)).json();
  const entry = entries.find((x) => x[key] === value);
  assert(entry, `Saved ${resource} record must exist`);
  created.push([resource, entry.id]);
  return entry;
};
try {
  await page.goto(base);
  await page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }).waitFor();
  await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /Due today/ }).click();
  await page.getByRole('heading', { name: "Today's tasks", exact: true }).waitFor();
  await page.getByRole('button', { name: 'Top 3 priorities', exact: true }).click();
  await page.goto(base + '/#tasks');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(projectName);
  await page
    .getByRole('dialog')
    .getByLabel('Description')
    .fill('Created through the browser test.');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await waitSaved();
  await locateRecord('projects', 'name', projectName);
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Title').fill(title);
  await page
    .getByRole('dialog')
    .getByLabel('Project', { exact: true })
    .selectOption({ label: projectName });
  await page.getByRole('dialog').getByLabel('Priority', { exact: true }).selectOption('High');
  await page
    .getByRole('dialog')
    .getByLabel('Tags (comma separated)')
    .pressSequentially('research, browser');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await waitSaved();
  const task = await locateRecord('tasks', 'title', title);
  assert(
    task.tags.join(',') === 'research,browser',
    'Comma-separated tags remain editable while typing',
  );
  await page.getByRole('button', { name: `Complete ${title}`, exact: true }).click();
  await page.getByRole('button', { name: `Reopen ${title}`, exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: `Reopen ${title}`, exact: true }).waitFor();
  await page.getByRole('button', { name: `Edit ${title}`, exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Title')
    .fill(title + ' edited');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await waitSaved();
  assert(
    (await (await page.request.get(`${base}/api/tasks/${task.id}`)).json()).title ===
      title + ' edited',
    'Task edit must persist',
  );
  await page.getByRole('button', { name: 'Kanban view' }).click();
  await page.getByRole('button', { name: new RegExp(title + ' edited') }).waitFor();
  await page.goto(base + '/#calendar');
  await page.getByRole('button', { name: 'New event', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Title').fill(`Browser event ${suffix}`);
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await waitSaved();
  await locateRecord('events', 'title', `Browser event ${suffix}`);
  await page.goto(base + '/#finances');
  await page.getByRole('button', { name: 'Record expense', exact: true }).first().click();
  await page.getByRole('dialog').getByLabel('Description').fill(`Browser expense ${suffix}`);
  await page.getByRole('dialog').getByLabel('Amount').fill('123.45');
  await page.getByRole('button', { name: 'Save expense', exact: true }).click();
  await waitSaved();
  const expense = await locateRecord('expenses', 'description', `Browser expense ${suffix}`);
  assert(expense.amountMinor === 12345, 'Expense preserves exact cents');
  await page.goto(base + '/#fitness');
  await page.getByRole('button', { name: 'New habit', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`Browser habit ${suffix}`);
  await page.getByRole('button', { name: 'Save habit', exact: true }).click();
  await waitSaved();
  await locateRecord('habits', 'name', `Browser habit ${suffix}`);
  const checkin = page
    .getByRole('button', { name: new RegExp(`^Check Browser habit ${suffix}`) })
    .filter({ hasNot: page.locator('[disabled]') });
  await checkin.first().click();
  await page
    .getByRole('button', { name: new RegExp(`^Uncheck Browser habit ${suffix}`) })
    .waitFor();
  await page.getByRole('button', { name: 'Log workout', exact: true }).first().click();
  await page
    .getByRole('dialog')
    .getByLabel('Name', { exact: false })
    .first()
    .fill(`Browser workout ${suffix}`);
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Exercise 1 name', exact: true })
    .fill('Squat');
  await page.getByRole('dialog').getByLabel('Exercise 1 weight').fill('60');
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await waitSaved();
  await locateRecord('workouts', 'name', `Browser workout ${suffix}`);
  await page.goto(base + '/#research');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Title').fill(`Browser note ${suffix}`);
  await page
    .getByRole('dialog')
    .getByLabel('Content / observations')
    .fill('An observation saved locally.');
  await page.getByRole('button', { name: 'Save research note', exact: true }).click();
  await waitSaved();
  await locateRecord('notes', 'title', `Browser note ${suffix}`);
  await page.goto(base + '/#assistant');
  await page.getByRole('button', { name: 'How much did I spend this week?' }).click();
  await page.getByText('Orbit · local rules', { exact: true }).waitFor();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog').waitFor();
  await page.getByPlaceholder('Search pages, actions, or tasks…').fill('calendar');
  await page.getByRole('button', { name: 'Go to Calendar' }).click();
  assert(page.url().endsWith('#calendar'), 'Command palette navigates');
  const pages = [
    'overview',
    'tasks',
    'calendar',
    'research',
    'inbox',
    'finances',
    'fitness',
    'assistant',
    'settings',
    'automations',
  ];
  for (const id of pages) {
    await page.goto(base + '/#' + id);
    await page.locator('main h1').waitFor();
    assert(await page.locator('main h1').innerText(), `${id} has a heading`);
  }
  await page.goto(base + '/#settings');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.screenshot({ path: 'test-results/settings-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of pages) {
    await page.goto(base + '/#' + id);
    await page.locator('main h1').waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) {
      await page.screenshot({ path: `test-results/overflow-${id}.png`, fullPage: true });
      console.log(
        await page.evaluate(() =>
          [...document.querySelectorAll('main *')]
            .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
            .map((el) => ({
              tag: el.tagName,
              class: el.className,
              right: el.getBoundingClientRect().right,
            }))
            .slice(0, 20),
        ),
      );
    }
    assert(!overflow, `${id} must not overflow the mobile viewport`);
  }
  await page.goto(base + '/#overview');
  await page.screenshot({ path: 'test-results/overview-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Finances', exact: true }).click();
  await page.getByRole('heading', { name: 'Finances', exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(base + '/#tasks');
  await page.getByRole('button', { name: `Delete ${title} edited`, exact: true }).click();
  await page.getByRole('button', { name: 'Keep record', exact: true }).click();
  assert(
    (await page.request.get(`${base}/api/tasks/${task.id}`)).status() === 200,
    'Cancel deletion preserves record',
  );
  await page.getByRole('button', { name: `Delete ${title} edited`, exact: true }).click();
  await page.getByRole('button', { name: 'Delete record', exact: true }).click();
  await waitSaved();
  assert(
    (await page.request.get(`${base}/api/tasks/${task.id}`)).status() === 404,
    'Confirmed deletion removes record',
  );
  assert(errors.length === 0, `No uncaught browser errors: ${errors.join('; ')}`);
  console.log(
    'Browser smoke passed: CRUD, persistence after reload, habit check-in, assistant, command palette, themes, all 10 pages at desktop/mobile, mobile navigation and deletion confirmation.',
  );
} finally {
  for (const [resource, id] of created.reverse())
    await page.request.delete(`${base}/api/${resource}/${id}`, { data: { confirm: true } });
  await browser.close();
}
