const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const path = require("path");
const csv = require("csv-parser");
const hbs = require("express-handlebars");
const fs = require("fs");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

//express
const app = express();
const port = 3000;
app.use(express.static(__dirname + "/public"));

//handlebars
var hbshelper = hbs.create({
  helpers: {
    if: function (v1, v2, options) {
      if (v1 <= v2) {
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
  tabela = []; //Limpa dados anteriores

  dados.forEach((dado) => {
    //HP

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

        if (Modelo) {
          tabela.push({
            Fila: dado.Fila,
            IP: dado.IP,
            Modelo: Modelo,
            Toner: Toner,
            KitDeManutencao: KitDeManutencao,
            UnidadeDeImagem: "Não possui",
          });
        }
      })
      .catch((err) => {});

    //SAMSUNG

    let urlSamsung =
      "http://" + dado.IP + "/sws/app/information/home/home.json";

    function filtrar(indice1, indice2, dados) {
      let filtro = dados.substring(
        dados.search(indice1),
        dados.search(indice2)
      );
      let indice = filtro.search("remaining");
      let valor = filtro.substring(indice + 10, indice + 13).trim();
      return valor;
    }

    function filtrarModelo(indice1, indice2, dados) {
      let filtro = dados.substring(
        dados.search(indice1),
        dados.search(indice2)
      );
      let indice3 = filtro.search('"');
      let indice4 = filtro.search(",");
      let valor = filtro.substring(indice3 + 1, indice4 - 1).trim();
      return valor;
    }

    axios(urlSamsung)
      .then((response) => {
        let UnidadeDeImagem = filtrar("drum_black", "drum_cyan", response.data);
        let Toner = filtrar("toner_black", "toner_cyan", response.data);
        let Modelo = filtrarModelo("model_name", "host_name", response.data);

        if (Toner == "1,") {
          Toner = "1";
        }

        if (UnidadeDeImagem == "0,") {
          UnidadeDeImagem = "Não possui";
        }

        if (Modelo) {
          tabela.push({
            Fila: dado.Fila,
            IP: dado.IP,
            Modelo: Modelo,
            Toner: Toner,
            KitDeManutencao: "Não possui",
            UnidadeDeImagem: UnidadeDeImagem,
          });
        }
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
