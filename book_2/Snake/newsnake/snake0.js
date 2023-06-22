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

var grafika = {
    canvas: document.getElementById("canvas"),
    negyzetMeret: 30,
    tablaMegrajzolas: function() {
        var ctx = grafika.canvas.getContext("2d");
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
    }
};
grafika.tablaMegrajzolas();



