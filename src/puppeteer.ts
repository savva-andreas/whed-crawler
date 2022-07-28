import chalk from 'chalk';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

class CrawlerService {
    public browser: puppeteer.Browser;
    public page: puppeteer.Page;
    private total: number;
    private currentPage: number;
    private totalPage: number;
    private limit = 100;

    public async start(url: string, headless = false) {
        try {
            this.browser = await puppeteer.launch({
                args: ['--start-maximized', '--no-sandbox', '--no-sandbox',
                    '--disable-setuid-sandbox',
                    "--disable-gpu",
                    "--disable-dev-shm-usage"],
                devtools: true,
                executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                headless: false  // extensions are allowed only in head-full mode,

            });
            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1920, height: 1080 });
            await this.page.goto(url);
        } catch (error) {
            throw new Error(error);
        }
    }

    public async search() {
        const results = [];
        const countries = [];
        const filePath = path.join(process.cwd(), "results", 'institutions.json');
        try {
            await this.clear("#qsearch #search");
            
            const $ = cheerio.load(await this.page.content());
            
            $('#qsearch #Chp1 option').each((index, el) => {
                countries.push($(el).val());
            });

            for (let country of countries) {           
                await this.page.select('#qsearch #Chp1', country);
                await this.page.click('#fsearch p > input[type="button"]');
                await this.page.waitForSelector('#contenu');
                const preContent = await this.page.content();

                // if no result return
                const $ = cheerio.load(await this.page.content());
                console.log(chalk.bgGreen(' RESULT Found '), chalk.green('%s total result %s'), country, $('#results li').length);
                if ($('#results li').length === 0) {                    
                    continue;
                }

                // select limit to 100 per page
                await this.page.evaluate(() => {
                    const selector = '.tri select[name="nbr_ref_pge"]';
                    const option = 'option:nth-child(4)'
                    const selectElement: HTMLOptionElement = document.querySelector(`${selector} > ${option}`);
                    selectElement.selected = true;
                    const element = document.querySelector(selector);
                    const event = new Event('change', { bubbles: true });
                    element.dispatchEvent(event);
                });
                await this.page.waitForNavigation();
                const content = await this.page.content();

                // set pagination
                this.setPagination(content);

                // start crwaling
                await this.processCrawling(country, results);                
            }
            console.timeEnd('Crawling Time');
            fs.writeFileSync(filePath, JSON.stringify(results, null, 0), 'utf-8');
        } catch (error) {
            throw new Error(error);
        }
    }

    public async processCrawling(country: string, results: any[]) {
        let length = 0;
        while (this.currentPage <= this.totalPage) {
            await this.page.waitForSelector('#contenu');
            const content = await this.page.content();
            // extract html to array value
            const $ = cheerio.load(content);
            $('#results li').each((index, el) => {
                const id = $(el).prev('span').text().trim();
                const name = $(el).find('h3 a').text().replace('Expand result for ', '').trim();
                const shortName = $(el).find('.i_name').text().trim();
                //const division = $(el).find('.divisions strong').text().trim().split(';').map((i) => i.trim());
                console.log(chalk.bgGreen(' COUNTRY '), chalk.green('$id:%s name %s'), id, name);
                length++;
                results.push({ country, id, name, shortName });
            });
            // if last page stop next
            if (this.currentPage !== this.totalPage) {
                await this.page.click('.pagination a.next');
            }
            this.currentPage += 1;
        }
        console.log(chalk.bgGreen(' RESULT '), chalk.green('%s total result %s'), country, length);
    }

    public setPagination(content: string) {
        const $ = cheerio.load(content);
        const totalText = $('.pagination .prem').first().text();
        const total = totalText.match(/(?<=of).*/g)[0];

        this.total = +total;
        this.totalPage = Math.ceil(this.total / this.limit);
        this.currentPage = 1;
    }

    public async clear(selector: string) {
        await this.page.evaluate(($selector) => {
            document.querySelector($selector).value = "";
        }, selector);
    }
}

// Export a singleton instance in the global namespace
export const crawler = new CrawlerService();