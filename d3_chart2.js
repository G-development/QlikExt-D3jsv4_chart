define([
        //here are the dependencies;
        'qlik',
        'jquery',

        './lib/d3.v4.min',

        'css!./css/master.css',

        './properties',
        './initial',

        'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.4/lodash.js'
    ],
    function(qlik, $, d3, cssCont, props, initial) {
        'use strict';

        return {

            //def of layout-panels - ref to properties.js / initial.js
            definition: props,
            initialProperties: initial,

            //Paint resp.Rendering logic
            paint: function($element, layout) {

                //Create hc var
                var self = this;
                var hc = layout.qHyperCube;

                //get datas
                var data = [];
                var data2 = null;
                var dLabel, m1Label, m2Label, m3Label = null;
                //Identify the number of measures and dimensions the user has selected
                if (hc.qDimensionInfo.length == 1 && hc.qMeasureInfo.length == 1) {
                    hc.qDataPages[0].qMatrix.forEach(function(qData) {
                        data.push({
                            "dValues": qData[0].qText,
                            "mValues": qData[1].qNum,
                            "dIndex": qData[0].qElemNumber
                        })
                    });

                    data2 = hc.qDataPages[0].qMatrix.map(function(qData) {
                        return {
                            "dValues": qData[0].qText,
                            "mValues": qData[1].qNum,
                            "dIndex": qData[0].qElemNumber
                        }
                    });


                    //ES6 syntax
                    var data3 = hc.qDataPages[0].qMatrix.map(qData => ({
                        dValues: qData[0].qText,
                        mValues: qData[1].qNum,
                        dIndex: qData[0].qElemNumber
                    }));

                    var dLabel = hc.qDimensionInfo[0].qFallbackTitle;
                    var mLabel = hc.qMeasureInfo[0].qFallbackTitle;

                } else if (hc.qDimensionInfo.length == 1 && hc.qMeasureInfo.length == 3) {

                    hc.qDataPages[0].qMatrix.forEach(function(qData) {

                        data.push({
                            "dValues": qData[0].qText,
                            "m1Values": qData[1].qNum,
                            "m2Values": qData[2].qNum,
                            "m3Values": qData[3].qNum
                        })
                    });

                    dLabel = hc.qDimensionInfo[0].qFallbackTitle;
                    m1Label = hc.qMeasureInfo[0].qFallbackTitle;
                    m2Label = hc.qMeasureInfo[1].qFallbackTitle;
                    m3Label = hc.qMeasureInfo[2].qFallbackTitle;
                }

                var DimVals = data.map(function(d) { return d.dValues; })
                var layers = d3.stack().keys(["m1Values", "m2Values", "m3Values"]).order(d3.stackOrderNone).offset(d3.stackOffsetNone)(data);
                var max = d3.max(layers[layers.length - 1], function(d) { return d[1]; });
                console.log('DimVals: ', DimVals,
                    'Layers: ', layers,
                    'Max:', max);
                console.log("Data:", data);

                var margin = { top: 20, right: 5, bottom: 40, left: 50 },
                    width = $element.width() - margin.left - margin.right,
                    height = $element.height() - margin.top - margin.bottom;

                var id = "ID_D3_" + layout.qInfo.qId;
                $element.attr("id", id);

                //Empty the extension content
                $("#" + id).empty();

                //x & y
                var x = d3.scaleBand()
                    .range([0, width])
                    .padding(0.3)
                    .round(true);
                var y = d3.scaleLinear()
                    .range([height, 0]);

                var color = null;
                color = d3.scaleOrdinal().range(["#32a852", "#f2ec3f", "#0cb2c4"]);
                margin.left += 20;

                color.domain(d3.keys(data[0]).filter(function(key) { return key !== "dValues"; }));
                data.forEach(function(d) {
                    var y0 = 0;
                    d.values = color.domain().map(function(name) { return { name: name, y0: y0, y1: y0 += +d[name] }; });
                    d.total = d.values[d.values.length - 1].y1;
                });

                // domains & axes
                y.domain([0, d3.max(data, function(d) { return d.total; })]);
                x.domain(DimVals);
                var yAxis = d3.axisLeft(y).tickFormat(d3.format(".2s"));
                var xAxis = d3.axisBottom(x);

                //-----------------------------------------------------------------------------
                // Build the chart
                var svg = d3.select("#" + id).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                svg.append("g").attr("id", "grid");

                //Add x axis
                svg.append("g")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);
                //  check x Labels
                if (layout.props.xAxisLabel) {
                    svg.append("text")
                        .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.top + 20) + ")")
                        .style("text-anchor", "middle")
                        .text(dLabel);
                }

                // Add the y Axis
                svg.append("g")
                    .attr("transform", "translate(0,0)")
                    .call(yAxis);
                // check y Labels
                if (layout.props.yAxisLabel) {
                    svg.append("text")
                        .attr("transform", "rotate(-90)")
                        .attr("y", 0 - margin.left + 20)
                        .attr("x", 0 - (height / 2))
                        .attr("dy", "1em")
                        .style("text-anchor", "middle")
                        .text(m1Label + ', ' + m2Label + ', ' + m3Label);
                }
                // checkGrid
                if (layout.props.grid) {
                    svg.append("g")
                        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
                        .attr("class", "gridlines");
                }

                var project_stackedbar = svg.selectAll(".project_stackedbar")
                    .data(data.reverse())
                    .enter().append("g")
                    .attr("class", "g")
                    .attr("transform", function(d) { return "translate(" + (x(d.dValues)) + ",0)"; });

                var bar_environment = project_stackedbar.selectAll("rect")
                    .data(function(d) { return d.values })
                    .enter()
                bar_environment.append("rect")
                    .attr("class", "rect-svg")
                    .attr("x", d => x(d.dValues))
                    .attr("y", function(d) {
                        return y(d.y1);
                    })
                    .attr("width", x.bandwidth() - 1)
                    .attr("height", function(d) {
                        return y(d.y0) - y(d.y1);
                    })
                    .style("fill", function(d) {
                        return color(d.name);
                    });


                debugger
                console.log("-------END-------");
                qlik.resolve();
            }
        };
    });