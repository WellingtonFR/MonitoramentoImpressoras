const axios = require("axios");
const cheerio = require("cheerio");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const url = "https://10.50.242.22/";
const tabela = [];

axios(url)
  .then((response) => {
    const html = response.data;
    const $ = cheerio.load(html);
    const Toner = $("#SupplyPLR0").text();
    const KitDeManutencao = $("#SupplyPLR1").text();

    tabela.push({ Toner: Toner, KitDeManutencao: KitDeManutencao });

    console.log(tabela);
  })
  .catch(console.error);
