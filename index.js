const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

//express
const app = express();
const port = process.env.PORT || 3000;

const url = "https://10.50.242.22/";
const tabela = [];

app.get("/", (req, res) => {
  axios(url).then((response) => {
    const html = response.data;
    const $ = cheerio.load(html);
    const Toner = $("#SupplyPLR0").text();
    const KitDeManutencao = $("#SupplyPLR1").text();

    tabela.push({ Toner: Toner, KitDeManutencao: KitDeManutencao });
    res.send(
      "Impressora IMP_094_FAT_REL_01 com kit de manutencao em " +
        KitDeManutencao +
        " e toner em " +
        Toner
    );
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
