import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { countries } from './countries';
import { crawler } from './puppeteer';

try {
  (async () => {
    console.time('Crawling Time');
    await crawler.start('https://whed.net/results_institutions.php', true);


    console.log(chalk.bgCyan(' LOG '), chalk.cyan('Processing'));
    await crawler.search();
    crawler.browser.close();
  })();
} catch (err) {
  console.log('Error', err);
}
