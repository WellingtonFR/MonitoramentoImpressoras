const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const path = require("path");
const csv = require("csv-parser");
const hbs = require("express-handlebars");
const fs = require("fs");
const { title } = require("process");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

//express
const app = express();
const port = 3000;
app.use(express.static(__dirname + "/public"));

//handlebars
var hbshelper = hbs.create({
  helpers: {
    if: function (v1, v2, options) {
      if (v1 == v2) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    },
  },
});

app.engine("handlebars", hbshelper.engine);
app.set("view engine", "handlebars");

let dados = [];
let tabela = [];

fs.createReadStream("Impressoras.csv")
  .pipe(csv())
  .on("data", (data) => dados.push(data));

function recuperaInformacoes() {
  tabela = [];
  dados.forEach((dado) => {
    let urlHP = "http://" + dado.IP;
    axios(urlHP)
      .then((response) => {
        let html = response.data;
        const $ = cheerio.load(html);
        let TonerBruto = $("#SupplyPLR0").text();
        let Toner = TonerBruto.substring(0, TonerBruto.length - 2);
        let KitDeManutencaoBruto = $("#SupplyPLR1").text();
        let KitDeManutencao = KitDeManutencaoBruto.substring(
          0,
          KitDeManutencaoBruto.length - 2
        );
        let Modelo = $("#HomeDeviceName").text();

        if (KitDeManutencao == "") {
          KitDeManutencao = "Não possui";
        }

        if (Toner == "<10") {
          Toner = Toner.substring(1, Toner.length);
        }

        if (!Modelo == "") {
          tabela.push({
            Fila: dado.Fila,
            IP: dado.IP,
            Modelo: Modelo,
            Toner: Toner,
            KitDeManutencao: KitDeManutencao,
          });
        }
      })
      .catch((err) => {});

    let urlSamsung =
      "http://" + dado.IP + "/sws/app/information/home/home.json";

    axios(urlSamsung)
      .then((response) => {
        let jsonData = response.data;
        let jsonSub = jsonData.substring(1, jsonData.length - 1);
        console.log(jsonSub);
      })
      .catch((err) => {});
  });
}

app.get("/", (req, res) => {
  recuperaInformacoes();
  res.render("home");
});

app.get("/info", (req, res) => {
  res.render("info", { tabela: tabela });
});

app.listen(port, () => {});
