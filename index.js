const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT | 3000;
app.use(cors());

app.get("/scrape", async (req, res) => {
  const searchQuery = req.query.q;

  if (!searchQuery) {
    return res.status(400).json({ error: "Missing 'q' parameter in the URL." });
  }

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    await page.goto(`https://www.youtube.com/results?search_query=${searchQuery}`);

    const results = await page.evaluate(() => {
      const videoResults = Array.from(document.querySelectorAll("ytd-video-renderer"));

      return videoResults.slice(0,5).map((videoResult) => {
        const thumbnailElement = videoResult.querySelector("ytd-thumbnail img");
        const thumbnail = thumbnailElement ? thumbnailElement.getAttribute("src") : null;
        const titleElement = videoResult.querySelector("#video-title");
        const title = titleElement ? titleElement.textContent.trim() : null;
        const channelNameElement = videoResult.querySelector("ytd-channel-name a");
        const channelName = channelNameElement ? channelNameElement.textContent : null;
        const videoLink = titleElement ? titleElement.getAttribute("href") : null;

        return { thumbnail, title, channelName, videoLink };
      });
    });

    const filteredResults = results.filter((item) => item.thumbnail !== null);
    const nullResults = results.filter((item) => item.thumbnail === null);

    for (const item of nullResults) {
      const newPage = await browser.newPage();
      await newPage.goto(`https://www.youtube.com/results?search_query=${item.title}`);
      const newResult = await newPage.evaluate(() => {
        const videoResult = document.querySelector("ytd-video-renderer");
        const thumbnailElement = videoResult.querySelector("ytd-thumbnail img");
        const thumbnail = thumbnailElement ? thumbnailElement.getAttribute("src") : null;
        return { thumbnail };
      });
      item.thumbnail = newResult.thumbnail;
      await newPage.close();
    }

    const finalArray = [...filteredResults, ...nullResults];
    return res.json(finalArray);
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "An error occurred while scraping data." });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});