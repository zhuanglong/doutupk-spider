import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

start();

async function start() {
  const totalPageNum = await getTotalPageNum();
  let curPageNum = 1;
  // 页数太大
  // delayQueue(curPageNum, totalPageNum);
  // 用这个试试即可
  delayQueue(curPageNum, 3);
}

// 获取总页数
function getTotalPageNum() {
  return axios.get("https://www.doutupk.com/article/list").then((res) => {
    const $ = cheerio.load(res.data);
    const len = $(".pagination .page-item").length;
    const num = $(".pagination .page-item")
      .eq(len - 2)
      .find(".page-link")
      .text();
    return num;
  });
}

// 延时队列，防止被网站屏蔽访问
function delayQueue(i, all) {
  if (i < all) {
    setTimeout(() => {
      parseListPage(i);
      i++;
      delayQueue(i, all);
    }, 3000);
  }
}

// 解析列表页，以标题创建目录
function parseListPage(pageNum) {
  const url = `https://www.doutupk.com/article/list/?page=${pageNum}`;
  axios.get(url).then((res) => {
    const $ = cheerio.load(res.data);
    $(".center-wrap > a").each((i, element) => {
      const detailPageUrl = $(element).attr("href");
      const title = $(element).find(".random_title").text();
      // 创建目录
      const cleanTitle = /(.*?)\d/gis.exec(title)[1];
      const imgDir = `./imgs/${cleanTitle}`;
      if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir);
      }
      parseDetailPage(detailPageUrl, imgDir);
    });
  });
}

// 解析图片地址，下载到本地
function parseDetailPage(pageUrl, dir) {
  axios.get(pageUrl).then((res) => {
    const $ = cheerio.load(res.data);
    $(".pic-content .artile_des a > img").each((i, element) => {
      const imgUrl = $(element).attr("src");
      const imgExtName = path.extname(imgUrl);
      const imgPath = `${dir}/${i}${imgExtName}`;
      // 创建写入图片流
      const ws = fs.createWriteStream(imgPath);
      axios.get(imgUrl, { responseType: "stream" }).then((imgRes) => {
        // 通过管道下载图片
        imgRes.data.pipe(ws);
        // 低版本 node 需要手动关闭
        imgRes.data.on("close", () => {
          ws.close();
        });
      });
    });
  });
}
