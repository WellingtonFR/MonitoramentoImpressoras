const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const path = require("path");
const csv = require("csv-parser");
const hbs = require("express-handlebars");
const fs = require("fs");
const { totalmem } = require("os");
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
let tabelaDetalhes = [];

fs.createReadStream("Impressoras.csv")
  .pipe(csv())
  .on("data", (data) => dados.push(data));

function recuperaInformacoes() {
  tabela = []; //Limpa dados anteriores

  dados.forEach((dado) => {
    //#region HP
    let urlHP = "http://" + dado.IP;
    axios(urlHP)
      .then((response) => {
        let html = response.data;
        let $ = cheerio.load(html);
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
            Marca: "HP",
          });
        }
      })
      .catch((err) => {});

    //#endregion

    //#region Samsung
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

    let urlSamsung =
      "http://" + dado.IP + "/sws/app/information/home/home.json";
    axios(urlSamsung)
      .then((response) => {
        let UnidadeDeImagem = filtrar("drum_black", "drum_cyan", response.data);
        let Toner = filtrar("toner_black", "toner_cyan", response.data);
        let Modelo = filtrarModelo("model_name", "host_name", response.data);

        for (i = 1; i <= 9; i++) {
          if (Toner == i + ",") {
            Toner = i;
          }
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
            Marca: "Samsung",
          });
        }
      })
      .catch((err) => {});

    //#endregion
  });
}

async function recuperaDetalhes(
  ip,
  fila,
  modelo,
  toner,
  kitDeManutencao,
  marca
) {
  tabelaDetalhes = []; //Limpa dados anteriores

  if (marca == "HP") {
    //HP
    let urlHP = "http://" + ip + "/hp/device/InternalPages/Index?id=UsagePage";
    await axios(urlHP)
      .then((response) => {
        let html = response.data;
        let $ = cheerio.load(html);
        let Serial = $(
          "#UsagePage\\.DeviceInformation\\.DeviceSerialNumber"
        ).text();
        let TotalDeImpressoes = $(
          "#UsagePage\\.EquivalentImpressionsTable\\.Total\\.Total"
        ).text();

        if (modelo == "HP LaserJet E50145") {
          TotalDeImpressoes = $(
            "#UsagePage\\.EquivalentImpressionsTable\\.Print\\.Total"
          ).text();
        }

        TotalDeImpressoes = TotalDeImpressoes.substring(
          0,
          TotalDeImpressoes.length - 2
        );
        TotalDeImpressoes = TotalDeImpressoes.replace(",", ".");

        if (kitDeManutencao == "") {
          kitDeManutencao = "Não possui";
        }

        if (Serial || TotalDeImpressoes) {
          tabelaDetalhes.push({
            Fila: fila,
            IP: ip,
            Modelo: modelo,
            Serial: Serial,
            Toner: toner,
            KitDeManutencao: kitDeManutencao,
            UnidadeDeImagem: "Não possui",
            TotalDeImpressoes: TotalDeImpressoes,
          });
        }
      })
      .catch((err) => {});
  }

  //SAMSUNG
  if (marca == "Samsung") {
    function filtrarSerial(indice1, dados) {
      let indice = dados.search(indice1);
      let valor = dados.substring(indice + 21, indice + 36).trim();
      return valor;
    }

    function filtrarTotalDeImpressoes(indice1, indice2, dados) {
      let filtro = dados
        .substring(dados.search(indice1), dados.search(indice2))
        .trim();
      let indice = filtro.search(":");
      let valor = filtro.substring(indice + 2, filtro.length - 1).trim();
      return valor;
    }

    let urlSamsung =
      "http://" + ip + "/sws/app/information/counters/counters.json";

    await axios(urlSamsung).then((response) => {
      let Serial = filtrarSerial("GXI_SYS_SERIAL_NUM", response.data);
      let TotalDeImpressoes = filtrarTotalDeImpressoes(
        "GXI_BILLING_TOTAL_IMP_CNT",
        "GXI_LARGE_BILLING_CNT_SUPPORT",
        response.data
      );

      Serial = Serial.replace(",", "");
      Serial = Serial.replace('"', "");

      if (Serial || TotalDeImpressoes) {
        tabelaDetalhes.push({
          Fila: fila,
          IP: ip,
          Modelo: modelo,
          Serial: Serial,
          Toner: toner,
          KitDeManutencao: kitDeManutencao,
          UnidadeDeImagem: "Não possui",
          TotalDeImpressoes: TotalDeImpressoes,
        });
      }
    });
    //.catch((err) => {});
  }
}

app.get("/", (req, res) => {
  recuperaInformacoes();
  res.render("home");
});

app.get("/info", (req, res) => {
  res.render("info", { tabela: tabela });
});

app.get("/detalhes", async (req, res) => {
  await recuperaDetalhes(
    req.query.ip,
    req.query.fila,
    req.query.modelo,
    req.query.toner,
    req.query.kitDeManutencao,
    req.query.marca
  );

  res.render("detalhes", { tabelaDetalhes: tabelaDetalhes });
});

app.listen(port, () => {});
