const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

class SPARQLQueryDispatcher {
	constructor( endpoint ) {
		this.endpoint = endpoint;
	}

	query( sparqlQuery ) {
		const fullUrl = this.endpoint + '?query=' + encodeURIComponent( sparqlQuery );
		const headers = { 'Accept': 'application/sparql-results+json' };

		return fetch( fullUrl, { headers } ).then( body => body.json() );
	}
}
const endpointUrl = 'https://query.wikidata.org/sparql';
const queryDispatcher = new SPARQLQueryDispatcher( endpointUrl );

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
    
    let mapPromise = new Promise((resolve,reject)=>{
        let xhr = new XMLHttpRequest();
        xhr.open("GET","/data/AgroMapa.GeoJson",true);
        xhr.onprogress = (event) => {
            loadingText.text(`Cargando... ${Math.floor(100*event.loaded/event.total)}%`);
        };
        xhr.onload = () => {
            resolve(JSON.parse(xhr.responseText));
        };
        xhr.send();
    });
    let cultivosPromise = new Promise((resolve,reject)=>{
        let xhr = new XMLHttpRequest();
        xhr.open("GET","/data/cultivos.xml",true);
        xhr.onload = () => {
            resolve(xhr.responseXML);
        };
        xhr.send();
    });
    Promise.all([mapPromise,cultivosPromise]).then(data => {
        loadingText.remove();
        main(svg,data[0],data[1]);
    });

    d3.selectAll(".close").on("click",()=>{
        d3.select("#infopanel").classed("infopanel-show",false);
    });
    

    /*
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
    });*/
}

function main(svg,mapData,cultivos){
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
        .append("rect")
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
            try{
                let id = data.properties.herbaceos[0][0];
                let res = cultivos.evaluate(`/agromapa/cultivo[@id='${id}']/color/text()`,cultivos,null,XPathResult.ANY_TYPE,null);
                let color = res.iterateNext().data;
                return color;
            }catch(e){
                return "white";
            }
        })
        .on("mouseover",(data)=>{

        })
        .on("click",(data)=>{
            if (d3.event.defaultPrevented) return;
            d3.select("#infotitle").text(data.properties.localname);
            d3.select("#infoprovincia").text(data.properties.alltags["is_in:province"]);
            const sparqlQuery = `SELECT ?image WHERE { 
                wd:${data.properties.wikidata} wdt:P18 ?image. 
              }`;
            
            queryDispatcher.query( sparqlQuery ).then( query => {
                let url = query.results.bindings[0].image.value;
                d3.select("#infoimage").style(`background-image`,`url('${url}')`);
            } );
            let infopanel = d3.select("#infopanel");
            let infocultivos = d3.select("#infocultivos");
            infocultivo(data.properties.herbaceos,
                window.innerWidth/4,
                data.properties.herbaceos.length*20);
            infopanel.classed("infopanel-show",true);
        });
}

function infocultivo(data,width,height){
    d3.selectAll(".grafico-actual").remove();
    let svg = d3
        .select("#infocultivos")
        .append("svg")
        .classed("grafico-actual",true)
        .attr("width",width)
        .attr("height",height);

    let x = d3
        .scaleLinear()
        .domain([0,d3.max(data.map((d)=> d[1]))])
        .range([0,width-130]);
    let y = d3
        .scaleBand()
        .rangeRound([0,height-20])
        .padding(.1)
        .domain(data.map((d)=> d[0]));
        
    let xAxis = d3.axisBottom(x).ticks(5);
    let yAxis = d3.axisLeft(y).ticks(data.map(d => d[0]));
    svg.append("g").attr("class","x axis").attr("transform","translate(100,"+(height-20)+")").call(xAxis);
    svg.append("g").attr("class","y axis").attr("transform","translate(100,0)").call(yAxis);

    let dataZone = svg.append("g").attr("transform","translate(100,0)");
	dataZone.selectAll(".bar")
		.data(data)
		.enter()
		.append("rect")
		.attr("class","bar")
		.attr("x",(d) => { return "0"; })
		.attr("width",(d) => { return x(d[1]);})
		.attr("y",(d) => { return y(d[0]); })
		.attr("height",y.bandwidth)
		.attr("fill",(d) => { return "blue"; })

    console.log("D3 segundo gráfico");
}

window.addEventListener("load",setup);