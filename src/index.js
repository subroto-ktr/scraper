import { default as axios } from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const getData = async () => {
    let page = 0;
    let apiData;
    const finalJson = [];
    while (true) {
        const url = `${process.env.url}?p=${page}`;
        console.log("Current Page: ", page);
        console.log(url)
        
        try{
            apiData = await axios.get(url);
        }
        catch(e){
            console.log("Reached end of pages. No more data beyond page: ", (page-1));
            break;
        }
        const $ = cheerio.load(apiData.data);
        const inputText = $('body').text();
        const items = inputText.split(/\d+\.\s/).filter(item => item.trim() !== '');

        for (let i = 1; i < items.length - 2; i++) {
            const item = items[i]?.split('\n');
            const metaData = item[1]?.split('|');

            const obj = {
                "title": item[0].trim(),
                "points": metaData[0]?.trim(),
                "comments": !isNaN(parseInt((metaData[2]?.trim().split(/(\s+)/)[0]))) ? Number((metaData[2]?.trim().split(/(\s+)/)[0])) : 0
            }
            finalJson.push(obj);
        }

        page += 1;
    }
    await groupData(finalJson);
}

const groupData = async (finalJson) => {
    const groupedData = {};

    finalJson.forEach(item => {
        const comments = item.comments;
        const commentRange = Math.floor(comments / 100) * 100;

        if (!groupedData[commentRange]) {
            groupedData[commentRange] = [];
        }

        groupedData[commentRange].push(item);
    });

    const resultArray = Object.keys(groupedData).map(commentRange => ({
        [`${commentRange}-${(parseInt(commentRange) + 100)} comments`]: groupedData[commentRange]
    }));

    const finalData = JSON.stringify(resultArray, null, 2);
    const fileName = process.env.outputFileName + '.json';

    fs.writeFile(fileName, finalData, 'utf-8', (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log(`Data written to ${fileName}`);
        }
    });

}

getData();