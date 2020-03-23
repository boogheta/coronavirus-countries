d3.formatDefaultLocale({
  "decimal": ".",
  "thousands": " ",
  "grouping": [3],
  "currency": ["", ""],
});
d3.strFormat = d3.format(",d")
d3.formatShift = function(x) {
  if (!x) return "";
  return d3.format("+d")(x) + " day" + (Math.abs(x) > 1 ? "s": "");
}
d3.defaultColors = [
  "#9FA8DA", "#A5D6A7", "#CE93D8", "#FFE082",
  "#FFAB91", "#E0E0E0", "#40C4FF", "#F48FB1",
  "#FFCC80", "#64FFDA", "#B39DDB", "#E6EE9C",
  "#8C9EFF", "#EF9A9A", "#B0BEC5", "#9FA8DA",
  "#81D4FA", "#80CBC4", "#C5E1A5", "#FFF59D",
  "#BCAAA4", "#EA80FC", "#FF8A80", "#FFE57F"
];
d3.datize = function(d) {
  var dt = new Date(d);
  dt.setHours(0);
  return dt;
}

document.getElementById("corona").style.opacity = 1;
new Vue({
  el: "#corona",
  data: {
    lastUpdateStr: "",
    scope: null,
    scopes: {},
    scopeChoices: [],
    level: "country",
    countries: [],
    defaultPlaces: {
      World: ["Italy", "Iran", "South Korea", "France", "Germany", "Spain", "USA"],
    },
    countriesOrder: null,
    refCountry: null,
    refCountries: {},
    dates: [],
    values: {},
    cases: [
      {id: "confirmed",       selected: false,  total: {}, color: d3.defaultColors[0]},
      {id: "recovered",       selected: false,  total: {}, color: d3.defaultColors[1]},
      {id: "deceased",        selected: false,  total: {}, color: d3.defaultColors[2]},
      {id: "currently_sick",  selected: false,  total: {}, color: d3.defaultColors[3]}
    ],
    logarithmic: false,
    multiples: false,
    resizing: null,
    hoverDate: "",
    extent: null,
    curExtent: null,
    hiddenLeft: 0,
    hiddenRight: 0,
    no_country_selected: [{
      name: "Please select at least one place",
      color: "grey",
      value: "",
      selected: true,
      inactive: true
    }],
    help: false
  },
  computed: {
    legend: function() {
      return this.countries.filter(function(c) { return c.selected; });
    },
    casesLegend: function() {
      return this.cases.filter(function(c) { return c.selected; });
    },
    case: function() {
      if (this.multiples) {
        if (this.casesLegend.length == 1)
          return this.casesLegend[0].id;
        return "confirmed";
      }
      return (this.casesLegend[0] || {id: "confirmed"}).id;
    },
    caseLabel: function() { return (this.case || "cases").replace(/_/, ' '); },
    casesChosen: function() {
      return this.casesLegend.map(function(c) { return c.id }).join("&");
    },
    refCountrySelected: function() {
      return !!this.refCountry;
    },
    refCountriesSelection: function() {
      return (this.refCountries[this.scope] || []).filter(function(c) {
        return c.selected;
      });
    },
    url: function() {
      return (this.scope !== "World" ? "country="+this.scope+"&" : "") +
        (this.multiples ? this.casesChosen : this.case) +
        (this.logarithmic ? "&log" : "") +
        (this.multiples ? "&multiples" : "") +
        "&places=" + this.legend
          .map(function(c) { return c.name; })
          .join(",") +
        (this.refCountry ? "&align=" + this.refCountry : "");
    }
  },
  watch: {
    url: function(newValue) {
      var ref = this.refCountry;
      if (ref && this.legend.length && !this.legend.filter(function(c) {
        return c.name === ref;
      }).length) {
        this.refCountry = null;
        newValue = newValue.replace(/&align=.*$/, '');
      }
      window.location.hash = newValue;
    },
    scope: function(newValue) {
      this.countries.forEach(function(c) {
        c.shift = 0;
      });
      this.level = this.scopes[newValue].level;
      this.countries = this.scopes[newValue].countries;
      this.refCountry = null;
      this.countriesOrder = "cases";
      this.hiddenLeft = 0;
      this.hiddenRight = 0;
      this.sortCountries();
    },
    casesChosen: function() { this.sortCountries(); },
    countriesOrder: function() { this.sortCountries(); },
    refCountry: function(newValue) {
      if (newValue && this.scope) {
        var values = this.values[this.scope],
          dates = this.dates,
          cas = this.case,
          refStart = null,
          refId = this.countries.filter(function(c) { return c.name === newValue; })[0].id,
          refValues = values[refId][cas];
        this.countries.forEach(function(c) {
          if (c.name === newValue) {
            c.shift = 0;
            c.shiftStr = "";
          } else {
            var shifts = [],
              ndates = 0;
              curVal = null,
              lastVal = null;
            dates.forEach(function(d, i) {
              if (refValues[i] < 20 || ndates > 20) return;
              ndates++;
              for (var j = 1; j < dates.length ; j++) {
                curVal = values[c.id][cas][j];
                if (curVal < refValues[i]) {
                  lastVal = curVal;
                  continue;
                }
                shifts.push(i - j - (refValues[i] - curVal)/(curVal - lastVal));
                break;
              }
            });
            c.shift = Math.round(d3.mean(shifts));
            c.shiftStr = d3.formatShift(c.shift);
          }
        });
      } else this.countries.forEach(function(c) {
        c.shift = 0;
        c.shiftStr = "";
      });
    },
    multiples: function() {
      this.cases.forEach(function(c) {
        c.value = null;
      });
      this.hiddenLeft = 0;
      this.hiddenRight = 0;
      this.refCountry = null;
    }
  },
  mounted: function() {
    window.addEventListener("hashchange", this.readUrl);
    window.addEventListener("resize", this.onResize);
    this.download_data();
    setInterval(this.download_data, 3600000);
  },
  methods: {
    onResize: function() {
      if (this.resizing) return clearTimeout(this.resizing);
      this.resizing = setTimeout(this.resize, 50);
    },
    resize: function() {
      var menuH = window.innerHeight - (
        document.querySelector("nav").getBoundingClientRect().height +
        document.getElementById("controls").getBoundingClientRect().height +
        document.getElementById("lowermenu").getBoundingClientRect().height + 2);
      document.getElementById("countries").style.height = menuH + "px";
      this.draw();
      this.resizing = null;
    },
    readUrl: function(startup) {
      var el, options = {countries: []};
      window.location.hash.slice(1).split(/&/).forEach(function(opt) {
        el = decodeURIComponent(opt).split(/=/);
        if (el[0] === "countries" || el[0] === "places")
          options.countries = el[1] ? el[1].split(/,/) : [];
        else if (el[0] === "country")
          options.scope = el[1];
        else if (el[0] === "align")
          options.align = el[1];
        else options[el[0]] = true;
      });
      this.scope = options.scope || "World";
      if (startup == true) {
        if (!options.countries.length)
          options.countries = this.scopes[this.scope].countries.filter(function(c) {
            return c.selected;
          }).map(function(c) {
            return c.name;
          });
        if (!options.confirmed && !options.recovered && !options.deceased && !options.currently_sick)
          options.confirmed = true;
      }
      this.logarithmic = !!options.log;
      this.multiples = !!options.multiples;
      this.cases.forEach(function(c) {
        c.selected = !!options[c.id];
      });
      this.scopes[this.scope].countries.forEach(function(c) {
        c.selected = !!~options.countries.indexOf(c.name);
      });
      this.refCountry = options.align || null;
      this.$nextTick(startup == true ? this.resize : this.draw);
    },
    download_data: function() {
      var cacheBypass = new Date().getTime();
      d3.json(
        "data/coronavirus-countries.json?" + cacheBypass,
        this.prepareData
      );
    },
    prepareData: function(data) {
      var cas = this.case,
        cases = this.cases,
        scopes = this.scopes,
        scopeChoices = this.scopeChoices,
        values = this.values,
        refCountries = this.refCountries,
        defaultPlaces = this.defaultPlaces,
        staticCountriesSort = this.staticCountriesSort,
        levelLabel = this.levelLabel;
      Object.keys(data.scopes).forEach(function(scope) {
        values[scope] = {}
        cases.forEach(function(ca) {
          ca.total[scope] = 0;
        });
        scopes[scope] = {
          "level": data.scopes[scope].level,
          "countries": Object.keys(data.scopes[scope].values)
            .map(function(c) {
              var maxVals = {},
                lastVals = {},
                cid = c.toLowerCase().replace(/[^a-z]/, '');
              values[scope][cid] = {};
              cases.forEach(function(ca) {
                values[scope][cid][ca.id] = data.scopes[scope].values[c][ca.id];
                maxVals[ca.id] = d3.max(values[scope][cid][ca.id]);
                lastVals[ca.id] = values[scope][cid][ca.id][data.dates.length - 1];
                if (c !== "total")
                  ca.total[scope] += lastVals[ca.id];
              });
              return {
                id: cid,
                name: (c === "total" ? scope : c),
                color: "",
                value: null,
                shift: 0,
                shiftStr: "",
                maxValues: maxVals,
                lastValues: lastVals,
                lastStr: "",
                selected: false
              };
            })
            .sort(staticCountriesSort(cas, "cases"))
        }
        var startPlaces = (
          defaultPlaces[scope] ||
          scopes[scope].countries.slice(1, 6).map(function(c) { return c.name; })
        );
        scopes[scope].countries.forEach(function(c) {
          c.selected = !!~startPlaces.indexOf(c.name);
        });
        refCountries[scope] = scopes[scope].countries.filter(function(c) {
          return c.maxValues['confirmed'] >= 100;
        }).sort(function(a, b) {
          return b.maxValues['confirmed'] - a.maxValues['confirmed'];
        });
        cases.forEach(function(ca) {
          ca.total[scope] = d3.strFormat(ca.total[scope]);
        });
        scopeChoices.push({
          name: scope,
          label: scope + " " + levelLabel(scopes[scope].level)
        });
      });
      scopeChoices.sort(function(a, b) {
        if (b.name === "World") return 1
        if (a.name === "World") return -1
        if (b.name > a.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });
      if (!this.countriesOrder) this.countriesOrder = "cases";
      this.dates = data.dates.map(d3.datize);
      this.extent = Math.round((this.dates[this.dates.length - 1] - this.dates[0]) / (1000*60*60*24));
      this.lastUpdateStr = new Date(data.last_update*1000).toUTCString();
      this.readUrl(true);
    },
    levelLabel: function(level) {
      return (level + "s").replace(/ys$/, "ies");
    },
    selectCase: function(newCase) {
      if (!this.multiples)
        this.cases.forEach(function(c) {
          c.selected = (c.id === newCase);
        });
    },
    keepOnlyCountry: function(keep) {
      this.countries.forEach(function(c) {
        c.selected = (c.name === keep);
      });
    },
    staticCountriesSort: function(cas, field) {
      return function(a, b) {
        if (field === "cases" && a.lastValues[cas] !== b.lastValues[cas])
          return b.lastValues[cas] - a.lastValues[cas];
        else {
          if (b.name > a.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        }
      };
    },
    sortCountries: function() {
      return this.countries.sort(this.staticCountriesSort(this.case, this.countriesOrder));
    },
    draw: function() {
      d3.select(".svg").selectAll("svg").remove();

      if (this.multiples) this.drawMultiples();
      else this.drawSeries();

      this.clearTooltip();
    },
    drawMultiples: function() {

      var cas = this.case,
        legend = this.legend,
        values = this.values[this.scope],
        casesLegend = this.casesLegend,
        dates = this.dates.map(function(d) {
          return {
            date: d,
            legend: d3.timeFormat("%a %e %B %Y")(d)
          };
        }),
        logarithmic = this.logarithmic,
        start = this.dates[0],
        end = this.dates[this.dates.length - 1];
      this.curExtent = Math.round((end - start) / (1000*60*60*24));

      // Setup dimensions
      var margin = {top: 20, right: 60, bottom: 35, left: 40, horiz: 60, vert: 30},
        columns = Math.max(1, Math.ceil(Math.sqrt(this.legend.length))),
        svgW = window.innerWidth - document.querySelector("aside").getBoundingClientRect().width,
        width = Math.floor((svgW - margin.left - margin.right - Math.max(0, columns - 1)*margin.horiz)/columns),
        mainH = window.innerHeight - document.querySelector("nav").getBoundingClientRect().height,
        svgH = Math.max(140, mainH),
        height = Math.floor((svgH - margin.top - margin.bottom - Math.max(0, columns - 1)*margin.vert)/columns),
        xScale = d3.scaleTime().range([0, width]).domain([start, end]),
        xWidth = width / this.curExtent,
        xPosition = function(d) { return xScale(d3.max([start, d.date || d.data.date])) - xWidth/2; },
        multiplesMax = function(c) { return d3.max(casesLegend.map(function(cas) { return c.maxValues[cas.id]; })); },
        maxValues = legend.map(multiplesMax),
        yMax = Math.max(0, d3.max(maxValues)),
        yScale = d3[logarithmic ? "scaleLog" : "scaleLinear"]().range([height, 0]).domain([logarithmic ? 1 : 0, yMax]);
      this.no_country_selected[0].style = {
        "background-color": "lightgrey!important",
        top: (svgH / 2 - 20) + "px",
        left: (svgW / 2 - 150) + "px"
      };

      this.countries.forEach(function(c) {
        c.lastStr = d3.strFormat(c.lastValues[cas]);
      });

      // Prepare svg
      var svg = d3.select(".svg")
        .style("height", mainH + "px")
        .append("svg")
          .attr("width", svgW)
          .attr("height", svgH);

      // Draw multiples
      var hover = this.hover,
        displayTooltip = this.displayTooltip,
        clearTooltip = this.clearTooltip;
      this.legend.sort(function(a, b) {
        return b.maxValues[cas] - a.maxValues[cas];
      }).forEach(function(c, i) {
        var xIdx = i % columns,
          yIdx = Math.floor(i / columns),
          xPos = margin.left + xIdx * (width + margin.horiz),
          yPos = margin.top + yIdx * (height + margin.vert);
        c.style = {
          "background-color": "lightgrey!important",
          top: (yPos - 10) + "px",
          left: (xPos - 5) + "px"
        }
        var g = svg.append("g")
          .attr("transform", "translate(" + xPos + "," + yPos + ")");

        casesLegend.forEach(function(cas) {
          g.append("path")
            .datum(dates)
            .attr("id", c.id + "_" + cas.id)
            .attr("class", "line " + cas.id)
            .attr("fill", "none")
            .attr("stroke", cas.color)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 2)
            .attr("d", d3.line()
              .x(function(d) { return xScale(d.date); })
              .y(function(d, i) {
                if (logarithmic && values[c.id][cas.id][i] == 0)
                  return yScale(1);
                return yScale(values[c.id][cas.id][i]);
              })
            );
        });

        // Draw axis
        var ticks = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %d")).tickSizeOuter(0);
        if (width <= 400)
          ticks.ticks(2);
        g.append("g")
          .attr("class", "axis axis--x")
          .attr("transform", "translate(0, " + (height) + ")")
          .call(ticks);
        g.append("g")
          .attr("class", "axis axis--y")
          .attr("transform", "translate(" + (width) + ", 0)")
          .call(d3.axisRight(yScale).ticks(4 * Math.floor(height / 125), d3.strFormat).tickSizeOuter(0));
  
        // Draw tooltips surfaces
        g.append("g")
          .selectAll("rect.tooltip")
          .data(dates).enter().append("rect")
            .classed("tooltip", true)
            .attr("did", function(d, i) { return i; })
            .attr("country", c.id)
            .attr("x", xPosition)
            .attr("y", yScale.range()[1])
            .attr("width", xWidth)
            .attr("height", yScale.range()[0] - yScale.range()[1])
            .on("mouseover", hover)
            .on("mousemove", displayTooltip)
            .on("mouseleave", clearTooltip);
  
      });
      this.$forceUpdate();

    },
    drawSeries: function() {
      var cas = this.case;
      this.countries.forEach(function(c) {
        c.lastStr = d3.strFormat(c.lastValues[cas]);
      });
      this.legend.sort(function(a, b) {
        return b.maxValues[cas] - a.maxValues[cas];
      }).forEach(function(c, i) {
        c.color = d3.defaultColors[i % d3.defaultColors.length];
      });

      // Filter dates from zoom
      var values = this.values[this.scope],
        dates = this.dates,
        cas = this.case,
        logarithmic = this.logarithmic,
        hiddenLeft = this.hiddenLeft,
        hiddenRight = this.hiddenRight,
        zoomedDates = this.dates.slice(hiddenLeft, this.dates.length - hiddenRight).map(function(d) {
          return {
            date: d,
            legend: d3.timeFormat("%a %e %B %Y")(d)
          };
        }),
        shiftedDates = function(c) {
          return dates.slice(
            Math.max(hiddenLeft, c.shift),
            dates.length - Math.max(hiddenRight, -c.shift)
          ).map(function(d) {
            return {
              date: d,
              legend: d3.timeFormat("%a %e %B %Y")(d)
            };
          });
        },
        start = zoomedDates[0].date,
        end = zoomedDates[zoomedDates.length - 1].date;
      this.curExtent = Math.round((end - start) / (1000*60*60*24));

      // Setup dimensions
      var margin = {top: 20, right: 90, bottom: 25, left: 40},
        svgW = window.innerWidth - document.querySelector("aside").getBoundingClientRect().width,
        width = svgW - margin.left - margin.right,
        mainH = window.innerHeight - document.querySelector("nav").getBoundingClientRect().height - document.getElementById("legend").getBoundingClientRect().height,
        svgH = Math.max(140, mainH),
        height = svgH - margin.top - margin.bottom,
        xScale = d3.scaleTime()
          .range([0, width])
          .domain([start, end]),
        xWidth = width / this.curExtent,
        xPosition = function(d) {
          return xScale(d3.max([start, d.date || d.data.date])) - xWidth/2;
        },
        shiftedVal = function(c, d, i) {
          var idx = i + Math.max(0, hiddenLeft - c.shift);
          return values[c.id][cas][idx];
        },
        shiftedMaxVal = function(c) {
          return d3.max(shiftedDates(c).map(function(d, i) {
            return shiftedVal(c, d, i);
          }));
        },
        yMax = Math.max(0, d3.max(this.legend.map(shiftedMaxVal))),
        yScale = d3[logarithmic ? "scaleLog" : "scaleLinear"]()
          .range([height, 0])
          .domain([logarithmic ? 1 : 0, yMax]);

      // Prepare svg
      var g = d3.select(".svg")
      .style("height", mainH+"px")
      .append("svg")
        .attr("width", svgW)
        .attr("height", svgH)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Draw series
      this.legend.forEach(function(c) {
        g.append("path")
          .datum(shiftedDates(c))
          .attr("id", c.id)
          .attr("class", "line")
          .attr("fill", "none")
          .attr("stroke", c.color)
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .attr("stroke-width", 2)
          .attr("d", d3.line()
            .x(function(d) { return xScale(d.date); })
            .y(function(d, i) {
              var val = shiftedVal(c, d, i);
              if (logarithmic && val == 0)
                return yScale(1);
              return yScale(val);
            })
          );
      });

      // Draw axis
      g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0, " + (height) + ")")
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %d")).tickSizeOuter(0));
      g.append("g")
        .attr("class", "axis axis--y")
        .attr("transform", "translate(" + (width) + ", 0)")
        .call(d3.axisRight(yScale).ticks(4 * Math.floor(height / 125), d3.strFormat).tickSizeOuter(0));

      // Draw tooltips surfaces
      g.append("g")
        .selectAll("rect.tooltip")
        .data(zoomedDates).enter().append("rect")
          .classed("tooltip", true)
          .attr("did", function(d, i) { return i; })
          .attr("x", xPosition)
          .attr("y", yScale.range()[1])
          .attr("width", xWidth)
          .attr("height", yScale.range()[0] - yScale.range()[1])
          .on("mouseover", this.hover)
          .on("mousemove", this.displayTooltip)
          .on("mouseleave", this.clearTooltip)
          .on("wheel", this.zoom)
          .on("dblclick", this.zoom);
    },
    hover: function(d, i) {
      d3.selectAll('rect[did="' + i + '"]').style("fill-opacity", 0.25);
    },
    displayTooltip: function(d, i, rects) {
      this.hoverDate = d.legend;

      var values = this.values[this.scope];
      if (!this.multiples) {
        var cas = this.case,
          hiddenLeft = this.hiddenLeft;
        this.legend.forEach(function(c) {
          var val = values[c.id][cas][i + hiddenLeft - c.shift];
          if (val == undefined) c.value = "";
          else c.value = d3.strFormat(values[c.id][cas][i + hiddenLeft - c.shift]);
        });
      } else {
        var country = d3.select(rects[i]).attr('country');
        this.cases.forEach(function(c) {
          c.value = d3.strFormat(values[country][c.id][i]);
        });
      }
      d3.select(".tooltipBox")
      .style("left", d3.event.pageX - 80 + "px")
      .style("top", d3.event.pageY - 50 + "px")
      .style("display", "block");
    },
    clearTooltip: function(d, i) {
      var cas = this.case,
        legend = this.legend,
        multiples = this.multiples;
      this[multiples ? "cases" : "legend"].forEach(function(c) {
        c.value = (multiples && legend.length == 1 ? d3.strFormat(legend[0].lastValues[c.id]) : null);
      });
      this.$forceUpdate();
      d3.selectAll('rect[did="' + i + '"]').style("fill-opacity", 0);
      d3.select(".tooltipBox").style("display", "none");
    },
    hoverCase: function(cas, hov) {
      if (this.multiples && cas.selected)
        d3.selectAll("." + cas.id).classed("hover", hov);
    },
    zoom: function(d, i, rects) {
      var direction = (d3.event.deltaY && d3.event.deltaY > 0 ? -1 : 1),
        days = this.curExtent / 3,
        gauge = (i + 1) / rects.length,
        gaugeLeft = (gauge > 0.05 ? gauge : 0),
        gaugeRight = (gauge < 0.95 ? 1 - gauge : 0);
      if (direction == 1 && this.extent - this.hiddenLeft - this.hiddenRight < 15) return;
      this.clearTooltip();
      this.hiddenLeft += Math.floor(gaugeLeft * days * direction);
      this.hiddenRight += Math.floor(gaugeRight * days * direction);
      if (this.hiddenLeft < 0) this.hiddenLeft = 0;
      if (this.hiddenRight < 0) this.hiddenRight = 0;
      this.draw();
      this.displayTooltip(d, i, rects);
    },
    exportData: function() {
      var a = document.createElement('a');
      a.href = "data/coronavirus-countries.json";
      a.download = "coronavirus-countries.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
});
