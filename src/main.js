const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

function setup(){
    let svg = d3.select("body")
        .append("svg")
        .attr("width",WIDTH)
        .attr("height",HEIGHT);

    let mapData = d3.json("/data/Castile and León_AL8.GeoJson");
    let herbaceosData = d3.csv("/data/herbaceos_2017.csv");
    let leñososData = d3.csv("/data/leñosos_2017.csv");
    
    let count = 0;
    let loading = [mapData,herbaceosData,leñososData];
    loading.forEach(p => {
        p.then(()=>{
            count++;
            console.log(`Progress: ${count/loading.length}`);
        });
    })
    Promise.all(loading).then(data => {
        let mapData = data[0];
        let herbaceosData = data[1];
        let leñososData = data[2];
        main(svg,mapData,herbaceosData,leñososData);
        console.log("Finished loading");
    });
}

function main(svg,mapData,herbaceosData,leñososData){
    let features = mapData.features;
    let projection = d3.geoMercator()
        .fitExtent([[0,40],[WIDTH,HEIGHT]],mapData);
    let geoPath = d3.geoPath(projection);
    svg.selectAll(".country")
        .data(features)
        .enter()
        .append("path")
        .attr("class","country")
        .attr("d",geoPath)
        .style("stroke","black")
        .style("fill",(data,i)=>{
            let colors = ["black"];
            return colors[i%colors.length];
        });
}

window.addEventListener("load",setup);