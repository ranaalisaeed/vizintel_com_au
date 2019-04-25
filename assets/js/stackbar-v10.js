/*
Stack bar chart with
  * Create data nest with d3.nest().entries()
      * because d3.nest().map() adds weird '$' to each value
  * Generate categories from data automatically
  * x axis as Ordinal (Linear (scaleTime) scale not ideal for bar charts)
  * Legend generated using d3-legend plugin and added to svg (not chartGroup)
  * Legend styled using legendCells class which the plugin auto creates
  * Move generic code before data load
  * Create functions initialChart & updateChart
  * Add links to d3-scale-chromatic
  * Generate filtered data_stack and get unique suburbs from it
  * Add divs to host chart and select elements
  * Add inital data_nest to show sub of all suburbs (choose only suburbs that have high volume)
*/

// var parseDate = d3.timeParse("%Y")

var height = 200;
var width = 850;
var margin = { left: 60, right: 30, top: 30, bottom: 80 };

var svg = d3.select('#stacked').append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);
var chartGroup = svg.append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

var x = d3.scaleBand().rangeRound([0, width]).padding(0.05)
var y = d3.scaleLinear().range([height, 0]);
var color = d3.scaleOrdinal(d3.schemeSet3) // Try github.com/d3/d3-scale-chromatic

d3.csv("sales-openrefined.csv",
  // Suburb,Quarter,PropType,value
  // Abbeyard,2000Q1,Houses,0
  // Abbotsford,2000Q1,Houses,21
  // Aberfeldie,2000Q1,Houses,4
  // Aberfeldy,2000Q1,Houses,0
  // Acheron,2000Q1,Houses,1

  // FORMAT CELLS IN EACH ROW
  function(d) {
    return {
      suburb: d.Suburb,
      // year: parseDate(d.Quarter.substring(0,4)).getFullYear(),
      year: d.Quarter.substring(0, 4),
      quarter: d.Quarter.substring(4),
      proptype: d.PropType.toLowerCase(),
      total: +d.value
    }
  }).then(function(data_csv) {

    // VIEW RAW DATA
    // console.log('raw csv:', data_csv)

    // EXTRACT DIMENSIONS - 1
    var categories = [], years = [];
    data_csv.map(function(d){
      if(categories.indexOf(d.proptype) < 0) { categories.push(d.proptype) }
      if(years.indexOf(d.year) < 0) { years.push(d.year) }
    })
    // console.log('categories', categories)
    // console.log('years', years)

    // PREPARE DATA FOR INITIAL CHART
    var data_nest_init = d3.nest()
      .key(function(d){ return d.year; })
      .key(function(d){ return d.proptype; })
      .rollup(function(v){ return d3.sum(v, function(d){ return d.total; }); })
      .entries(data_csv)
    // console.log(JSON.stringify(data_nest_init));
    // console.log('data_nest_init:', data_nest_init)
    var data_stack_init = []
    data_nest_init.map(function(d){
      var t = {}
      t.year = d.key
      categories.forEach(function(e,i){
        t[e] = d.values[i].key == e ? d.values[i].value : 0
      })
      data_stack_init.push(t)
    })
    console.log('data_stack_init:', data_stack_init)


    // NEST DATA ON NEEDED DIMENSIONS & ROLLUP
    var data_nest = d3.nest()
      .key(function(d){ return d.suburb; })
      .key(function(d){ return d.year; })
      .key(function(d){ return d.proptype; })
      .rollup(function(v){ return d3.sum(v, function(d){ return d.total; }); })
      .entries(data_csv)
    // console.log(JSON.stringify(data_nest));
    // console.log('data_nest:', data_nest)

    // CREATE FLAT ARRAY OF OBJECTS - DATA STACK
    var data_stack = []
    data_nest.map(function(d){
      years.forEach(function(y,yi){
        var t = {}
        t.suburb = d.key
        if (d.values[yi] && d.values[yi].key == y) t.year = d.values[yi].key
        // t.year = d.values[yi] && d.values[yi].key == y ? d.values[yi].key : 0
        categories.forEach(function(c){
          for(var i=0; i<categories.length; i++){
            if (d.values[yi].values[i].key == c) t[c] = d.values[yi].values[i].value
            // t[c] = d.values[yi].values[i].key == c ? d.values[yi].values[i].value : 0
          }
        })
        data_stack.push(t)
      })
    })
    // console.log('data_stack:', data_stack)

    // Only retain suburbs with a total volumne of 100 properties in all years
    var data_stack_filt = data_stack.filter(function(d){
      return (d.houses + d.units + d.land) > 100;
    })
    // console.log('data_stack-filt:', JSON.stringify(data_stack_filt, null, 0))
    console.log('data_stack_filt:', data_stack_filt)

    var suburbs_filt = [...new Set(data_stack_filt.map(d=>d.suburb))]
    console.log('suburbs_filt:', suburbs_filt)

    // var data_stack_filt_init = d3.nest()
    //   .key(d=>d.year)
    //   .rollup(v=>d3.sum(v,d=>(d.houses+d.land+d.units)))
    //   .entries(data_stack_filt)
    // console.log('data_stack_filt_init:', data_stack_filt_init)

    x.domain(years)
    // y.domain([0, d3.max(data_stack, function(d){ return d.houses + d.units + d.land; })])

    // ADD AXES
    chartGroup.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      // .call(d3.axisBottom(x).ticks(20).tickFormat(d3.format('~g')))
      .call(d3.axisBottom(x))

    var yAxisHandle = chartGroup.append("g")
      .attr("class", "y axis")
      // .call(d3.axisLeft(y).ticks(5));

    // STACKED DATA INTO LAYERS - LAYOUT
    var stacker = d3.stack().keys(categories)
    // console.log(JSON.stringify(stacked_layers))
    // console.log('stacked_layers:', stacked_layers)

    // provide data_stack as parameter
    var initialChart = function(stack){
      // console.log('stack received', JSON.stringify(stack, null, 0))
      // console.log('stack received:', stack)
      y.domain([0, d3.max(stack, function(d){ return d.houses + d.units + d.land; })])
      yAxisHandle.call(d3.axisLeft(y))
      var stacked_layers = stacker(stack);
      // console.log('stacked_layers:', stacked_layers)
      var bars = chartGroup.selectAll('.stackedBar')
        .data(stacked_layers)
        .enter().append('g')
          .style('fill', function(d){ return color(d.key); })
          .attr('class', 'stackedBar')
          // .attr('stroke', 'white')
      bars.selectAll('rect.box')
        .data(function(layer){ return layer; })
        // .data(function(layer){ console.log('layer:', layer); return layer; })
        .enter().append('rect')
          .attr('x', function(d){ return x(d.data.year); })
          .attr('y', function(d){ return y(d[1]); })
          .attr('height', function(d){ return y(d[0]) - y(d[1]); })
          .attr('width', x.bandwidth())
          .attr('class', 'box')
    }

  var updateChart = function(stack){
    console.log('stack received', JSON.stringify(stack, null, 0))
    // console.log('stack received:', stack)
    y.domain([0, d3.max(stack, function(d){ return d.houses + d.units + d.land; })])
    yAxisHandle.transition().call(d3.axisLeft(y))

    var stacked_layers = stacker(stack);
    // console.log('stacked_layers:', stacked_layers)

    var bars = chartGroup.selectAll('.stackedBar')
      .data(stacked_layers)

    var boxes = bars.selectAll('rect.box')
      .data(function(layer){ return layer; })
      // .data(function(layer){ console.log('layer:', layer); return layer; })

    boxes.exit().remove()

    boxes.enter().append('rect')
      .attr('class', 'box')
      .attr('x', function(d){ return x(d.data.year); })
      .attr('y', function(d){ return y(d[1]); })
      .attr('height', function(d){ return y(d[0]) - y(d[1]); })
      .attr('width', x.bandwidth())

    boxes.transition().duration(250)
      .attr('x', function(d){ return x(d.data.year); })
      .attr('y', function(d){ return y(d[1]); })
      .attr('height', function(d){ return y(d[0]) - y(d[1]); })
      .attr('width', x.bandwidth())
  }

  initialChart(data_stack_init)
  // updateChart(data_stack_filt)

  // ADD LEGEND
  var legend = d3.legendColor()
    .scale(color)
    .shapeWidth(50)
    .labelWrap(30)
    .orient('horizontal')
    .labelOffset(2)
    .shapePadding(2)
    .labels(function(l){
      var string = l.generatedLabels[l.i]
      return string.charAt(0).toUpperCase() + string.substring(1);
    })
  svg.append("g")
    .attr("class", "legendOrdinal")
    .attr("transform", "translate(350, 260)")
    .call(legend);

  // Select selection
  var suburbMenu = d3.select('#suburbMenu').append('select')

  // Add options to Select selection
  suburbMenu.selectAll('option')
    .data(suburbs_filt)
    .enter().append('option')
      .attr('value',function(d){ return d; })
      .text(function(d){ return d; })

  suburbMenu.on('change', function(){
    // var selectedSub = d3.select(this).property('value')
    var selectedSub = this.value;
    // console.log('selectedSub', selectedSub)
    updateChart(data_stack_filt.filter(function(d){ return d.suburb == selectedSub; }))
  })



});
