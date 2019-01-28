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



    d3.select("#icon-wheat").on("click",()=>{
        d3.select("#infopanel-left-cultivos").classed("infopanel-left-show",true);
    });

    d3.select("#icon-house").on("click",()=>{
        d3.select("#infopanel-right-municipios").classed("infopanel-right-show",true);
    });
    
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

    function fillMap(data){
        try{
            let id = data.properties.cultivos[0][0];
            let res = cultivos.evaluate(`/agromapa/cultivo[@id='${id}']/color/text()`,cultivos,null,XPathResult.ANY_TYPE,null);
            let color = res.iterateNext().data;
            return color;
        }catch(e){
            return "white";
        }
    }

    function showMunicipio(data){
        d3.select("#infotitle").text(data.properties.localname);
        d3.select("#infoprovincia").text(data.properties.alltags["is_in:province"]);
        const sparqlQuery = `SELECT ?image WHERE { 
            wd:${data.properties.wikidata} wdt:P18 ?image. 
            }`;
        
        queryDispatcher.query( sparqlQuery ).then( query => {
            let url = query.results.bindings[0].image.value;
            d3.select("#infoimage").style(`background-image`,`url('${url}')`);
        } );
        let infopanel = d3.select("#infopanel-right-municipio");
        let infocultivos = d3.select("#infocultivos");
        infocultivo(data.properties.cultivos,
            window.innerWidth/4,
            data.properties.cultivos.length*20);
        infopanel.classed("infopanel-right-show",true);
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
        .style("fill",fillMap)
        .on("mouseover",(data)=>{

        })
        .on("click",(data)=>{
            if (d3.event.defaultPrevented) return;
            showMunicipio(data);
        });

    // PANEL LISTADO CULTIVOS
    let xpath = cultivos.evaluate("/agromapa/cultivo",cultivos,null,XPathResult.ANY_TYPE,null);
    let node, nodes = []
    while (node = xpath.iterateNext()){
        nodes.push(node);
    }
    d3.select("#list-cultivos").selectAll(".cultivo")
        .data(nodes)
        .enter()
        .append("p")
        .classed("cultivo",true)
        .text((data)=>{ return data.attributes.id.textContent })
        .on("click",(data)=>{
            let wikidata = data.getElementsByTagName("wikidata");
            if(wikidata.length > 0){
                const query = `SELECT ?scientific ?imagen ?article WHERE {
                    BIND(wd:${wikidata[0].textContent} AS ?id)
                    ?id wdt:P18 ?imagen.
                    ?id wdt:P225 ?scientific.
                    OPTIONAL {
                        ?article schema:about ?id .
                        ?article schema:inLanguage "es" .
                    }
                }`;
                queryDispatcher.query( query ).then( r => {
                    let scientific = r.results.bindings[0].scientific.value;
                    let imagen = r.results.bindings[0].imagen.value;
                    d3.select("#cientifico").text(scientific);
                    d3.select("#cultivo-imagen").style(`background-image`,`url('${imagen}')`);
                    d3.select("#links-cultivo").html("");

                    let urlSet = new Set();
                    for(let i=0;i<r.results.bindings.length;i++){
                        if(r.results.bindings[i].article != undefined){
                            let article = r.results.bindings[i].article.value;
                            if(urlSet.has(article)){
                                continue;
                            }
                            urlSet.add(article);

                            d3.select("#links-cultivo")
                                .append("li")
                                .append("a")
                                .attr("href",article)
                                .text(article);
                        }
                    }
                } );


            }
            d3.select("#infopanel-left-cultivos").classed("infopanel-left-show",false);
            let panel = d3.select("#infopanel-left-cultivo");
            panel.classed("infopanel-left-show",true);
            d3.select("#cultivo").text(data.attributes.id.textContent);
            d3.select("#ha-cultivadas").text(()=>{
                let ha = 0;
                for(let i=0;i<features.length;i++){
                    let cultivo = features[i].properties.cultivos.filter((d)=>{
                        if(d[0] == data.attributes.id.textContent){
                            return true;
                        }
                    });
                    if(cultivo.length > 0){
                        ha += cultivo[0][1];
                    }
                }
                return ha;
            });
            d3.selectAll(".country")
                .style("fill",(c)=>{
                    let cultivo = c.properties.cultivos.filter((d)=>{
                        if(d[0] == data.attributes.id.textContent){
                            return true;
                        }
                    });
                    if(cultivo.length > 0){
                        return "green";
                    }else{
                        return "white";
                    }
                });
        });
    
    // PANEL LISTADO MUNICIPIOS
    d3.select("#list-municipios")
        .selectAll(".municipio")
        .data(features)
        .enter()
        .append("p")
        .classed("municipio",true)
        .text((data) => { return data.properties.localname})
        .on("click",(data)=>{
            d3.select("#infopanel-right-municipios").classed("infopanel-right-show",false);
            showMunicipio(data);
        });
    d3.selectAll(".close-left").on("click",()=>{
        d3.select("#infopanel-left-cultivos").classed("infopanel-left-show",false);
        d3.select("#infopanel-left-cultivo").classed("infopanel-left-show",false);
        d3.selectAll(".country").style("fill",fillMap);
    });

    d3.selectAll(".close-right").on("click",()=>{
        d3.select("#infopanel-right-municipios").classed("infopanel-right-show",false);
        d3.select("#infopanel-right-municipio").classed("infopanel-right-show",false);
    });
    
}

function infocultivo(data,width,height){
    height = Math.max(height,100);
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
        .range([0,width-165]);
    let y = d3
        .scaleBand()
        .rangeRound([0,height-20])
        .padding(.1)
        .domain(data.map((d)=> d[0]));
        
    let xAxis = d3.axisBottom(x).ticks(5);
    let yAxis = d3.axisLeft(y).ticks(data.map(d => d[0]));
    svg.append("g").attr("class","x axis").attr("transform","translate(150,"+(height-20)+")").call(xAxis);
    svg.append("g").attr("class","y axis").attr("transform","translate(150,0)").call(yAxis);

    let dataZone = svg.append("g").attr("transform","translate(150,0)");
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