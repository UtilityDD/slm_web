/**
 * Dev smoke test for IdleStoryReminder (neo-brutal modal).
 * Requires: npm run dev, then npx --yes -p playwright node scripts/test-idle-modal.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.IDLE_TEST_URL || 'http://localhost:5173/idle-story-test.html?idleTest=1';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    try {
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForSelector('[data-testid="harness-ready"]', { timeout: 10000 });

        const dialog = page.locator('[role="dialog"]');
        await dialog.waitFor({ state: 'visible', timeout: 8000 });

        assert(await page.locator('.nb-hazard').count() === 1, 'Expected nb-hazard stripe');
        assert(await page.locator('.nb-tag').isVisible(), 'Expected category nb-tag');
        assert(await page.locator('#idle-story-reminder-title').isVisible(), 'Expected story title');
        assert(await page.getByRole('button', { name: 'Read full story' }).isVisible(), 'Expected read button');
        assert(await page.getByRole('button', { name: 'Not now' }).isVisible(), 'Expected dismiss button');

        const titleText = await page.locator('#idle-story-reminder-title').innerText();
        assert(titleText.length > 0, 'Story title should not be empty');

        await page.getByRole('button', { name: 'Not now' }).click();
        await dialog.waitFor({ state: 'hidden', timeout: 5000 });

        await dialog.waitFor({ state: 'visible', timeout: 8000 });
        await page.getByRole('button', { name: 'Read full story' }).click();
        await dialog.waitFor({ state: 'hidden', timeout: 5000 });

        await page.waitForFunction(
            () => document.querySelector('[data-testid="current-view"]')?.textContent?.includes('accident-stories'),
            null,
            { timeout: 5000 }
        );
        const openedStory = await page.locator('[data-testid="opened-story"]').innerText();
        assert(openedStory.includes('openedStory:') && !openedStory.includes('none'), 'Read should set openedStory id');

        console.log('PASS idle modal smoke test');
        console.log(`  title: ${titleText}`);
        console.log(`  ${openedStory}`);
    } finally {
        await browser.close();
    }
}

run().catch((err) => {
    console.error('FAIL idle modal smoke test');
    console.error(err);
    process.exit(1);
});
