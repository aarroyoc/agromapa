const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

function setup(){
    let svg = d3.select("#map")
        .append("svg")
        .attr("width",WIDTH)
        .attr("height",HEIGHT);

    let loadingText = svg
        .append("text")
        .attr("x","50%")
        .attr("y","50%")
        .attr("text-anchor","middle")
        .text("Cargando... 0%");

    let mapData = d3.json("/data/Castile and León_AL8.GeoJson");
    let herbaceosData = d3.csv("/data/herbaceos_2017.csv");
    let leñososData = d3.csv("/data/leñosos_2017.csv");
    
    let count = 0;
    let loading = [mapData,herbaceosData,leñososData];
    loading.forEach(p => {
        p.then(()=>{
            count++;
            loadingText.text(`Cargando... ${Math.floor(100*count/loading.length)}%`);
        });
    })
    Promise.all(loading).then(data => {
        let mapData = data[0];
        let herbaceosData = data[1];
        let leñososData = data[2];
        loadingText.remove();
        main(svg,mapData,herbaceosData,leñososData);
    });
}

function main(svg,mapData,herbaceosData,leñososData){
    let features = mapData.features;
    let projection = d3.geoMercator()
        .fitExtent([[0,50],[WIDTH,HEIGHT-50]],mapData);
    let geoPath = d3.geoPath(projection);




    let zoom = d3.zoom().on("zoom",zoomed);
    let map = svg
        .append("g")
        .call(zoom);
    
    

    function zoomed(){
        let transform = d3.event.transform;
        map.selectAll(".country").attr("transform",transform.toString());
    }

    let invisibleRect = map
    .append("rect");

    invisibleRect
        .attr("x",0)
        .attr("y",0)
        .attr("width",WIDTH)
        .attr("height",HEIGHT)
        .style("fill","red")
        .style("opacity",0);
        
    map.selectAll(".country")
        .data(features)
        .enter()
        .append("path")
        .attr("class","country")
        .attr("d",geoPath)
        .style("stroke","black")
        .style("fill",(data,i)=>{
            let colors = ["black"];
            return colors[i%colors.length];
        })
        .on("mouseover",(data)=>{

        })
        .on("click",(data)=>{
            if (d3.event.defaultPrevented) return;
            alert("Municipio: "+data.properties.localname);
        });
}

window.addEventListener("load",setup);