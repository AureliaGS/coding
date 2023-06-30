var jatek = {
    tabla: [ 
    "###############",
    "#             #",
    "#             #",
    "#             #",
    "#     ####    #",
    "#     ####    #",
    "#             #",
    "#             #",
    "#             #",
    "###############"
    ]
};
var kigyo = {
        reszek: [
            {x: 4, y: 2},
            {x: 3, y: 2},
            {x: 2, y: 2}
        ],
        irany: "E"
};

var grafika = {
    canvas: document.getElementById("canvas"),
    negyzetMeret: 30,
    tablaMegrajzolas: function(ctx) {
        var aktualisYoffset = 0;
        jatek.tabla.forEach(function sorEllenorzes(sor) {
            sor = sor.split("");
            var aktualisXoffset = 0;
            sor.forEach(function karakterEllenorzes(karakter){
                if(karakter == "#") {
                    ctx.fillStyle = "black";
                    ctx.fillRect(aktualisXoffset, aktualisYoffset, grafika.negyzetMeret, grafika.negyzetMeret);
                }
                aktualisXoffset += grafika.negyzetMeret;
            });
            aktualisYoffset += grafika.negyzetMeret;
        });
    },
    kigyoMegrajzolas: function(ctx) {
        var ctx = grafika.canvas.getContext("2d");
        kigyo.reszek.forEach(function reszMegrajzolas(resz) {
            var reszXhelye = resz.x * grafika.negyzetMeret;
            var reszYhelye = resz.y * grafika.negyzetMeret;
            ctx.fillStyle = "green";
            ctx.fillRect(reszXhelye, reszYhelye, grafika.negyzetMeret,grafika.negyzetMeret);
        })
    },
    jatekMegrajzolas: function() {
        var ctx = grafika.canvas.getContext("2d");
        grafika.tablaMegrajzolas(ctx);
        grafika.kigyoMegrajzolas(ctx);
    }
};
grafika.jatekMegrajzolas();



