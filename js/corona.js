var GA_MEASUREMENT_ID = "UA-10423931-9";
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', GA_MEASUREMENT_ID);

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
    init: true,
    lastUpdateStr: "",
    scope: null,
    scopes: {},
    scopeChoices: [],
    level: "country",
    countries: [],
    defaultPlaces: {
      //World: ["Italy", "Iran", "South Korea", "France", "Germany", "Spain", "USA"],
    },
    countriesOrder: null,
    refCountry: null,
    refCountries: {},
    values: {},
    cases: [
      {id: "confirmed",       selected: false,  total: {}, color: d3.defaultColors[0]},
      {id: "recovered",       selected: false,  total: {}, color: d3.defaultColors[1], disabled: true},
      {id: "deceased",        selected: false,  total: {}, color: d3.defaultColors[4]},
      {id: "currently_sick",  selected: false,  total: {}, color: d3.defaultColors[3], disabled: true}
    ],
    oldrecovered: false,
    caseChoice: null,
    refCase: "deceased",
    refCases: [
        {id: "confirmed", min_cases: 50, max_dates: 20},
        {id: "deceased",  min_cases: 10, max_dates: 30}
    ],
    logarithmic: false,
    multiples: false,
    resizing: null,
    hoverDate: "",
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
      return this.cases.filter(function(c) { return !c.disabled && c.selected; });
    },
    case: function() {
      if (this.multiples) {
        if (this.casesLegend.length == 1)
          return this.casesLegend[0].id;
        return "deceased";
      }
      return (this.casesLegend[0] || {id: "deceased"}).id;
    },
    caseLabel: function() { return (this.case || "cases").replace(/_/, ' '); },
    casesChosen: function() {
      return this.casesLegend.map(function(c) { return c.id }).join("&");
    },
    refCountrySelected: function() {
      return !!this.refCountry;
    },
    refCountriesSelection: function() {
      var refCountry = this.refCountry;
      return (this.refCountries[this.scope] || []).filter(function(c) {
        return c.selected || c.name === refCountry;
      });
    },
    url: function() {
      if (this.init) return window.location.hash.slice(1);
      return (this.scope !== "World" ? "country="+this.scope+"&" : "") +
        (this.multiples ? this.casesChosen : this.case) +
        (this.logarithmic ? "&log" : "") +
        (this.multiples ? "&multiples" : "") +
        "&places=" + (this.legend.length ? this.legend : this.scopes[this.scope].countries.filter(function(c) { return c.selected; }))
          .sort(this.staticCountriesSort(null, "names"))
          .map(function(c) { return c.name.replace(' ', '%20'); })
          .join(",") +
        (this.refCountry ? "&align=" + this.refCountry : "") +
        (this.refCase !== "confirmed" ? "&alignTo=" + this.refCase : "") +
        (this.oldrecovered ? "&oldrecovered" : "");
    }
  },
  watch: {
    url: function(newValue, oldValue) {
      window.location.hash = newValue;
      gtag('config', GA_MEASUREMENT_ID, {'page_path': location.pathname + location.search + location.hash});
    },
    scope: function(newValue, oldValue) {
      this.countries.forEach(function(c) {
        c.shift = 0;
      });
      this.level = this.scopes[newValue].level;
      this.countries = this.scopes[newValue].countries;
      var refCase = this.refCase,
        cas = this.refCases.filter(function(c){ return c.id === refCase; })[0];
      this.refCountries[newValue] = this.countries.filter(function(c) {
        return c.maxValues[cas.id] >= 3 * cas.min_cases;
      }).sort(function(a, b) {
        return b.maxValues[cas.id] - a.maxValues[cas.id];
      });
      if (oldValue) this.refCountry = null;
      this.countriesOrder = "cases";
      if (!this.countries.filter(function(c) { return c.selected; }).length) {
        var startPlaces = (
          this.defaultPlaces[this.scope] ||
          this.countries.sort(this.staticCountriesSort(this.case, "cases"))
            .slice(1, 8)
            .map(function(c) { return c.name; })
        );
        this.countries.forEach(function(c) {
          c.selected = !!~startPlaces.indexOf(c.name);
        });
      }
      this.hiddenLeft = 0;
      this.hiddenRight = 0;
      this.sortCountries();
    },
    casesChosen: function() { this.sortCountries(); },
    countriesOrder: function() { this.sortCountries(); },
    multiples: function() {
      this.cases.forEach(function(c) {
        c.value = null;
      });
      this.caseChoice = this.case;
      this.hiddenLeft = 0;
      this.hiddenRight = 0;
      this.refCountry = null;
      this.$nextTick(this.resizeMenu);
    },
    oldrecovered: function(newValue) {
      this.cases.forEach(function(c) {
        if (c.id !== "recovered" && c.id !== "currently_sick") return;
        c.disabled = !newValue;
      });
      this.$nextTick(this.resizeMenu);
      this.download_data();
    }
  },
  mounted: function() {
    this.download_data();
    //setInterval(this.download_data, 3600000);
  },
  methods: {
    onResize: function() {
      if (this.resizing) return clearTimeout(this.resizing);
      this.resizing = setTimeout(this.resize, 50);
    },
    resizeMenu: function() {
      var menuH = window.innerHeight - (
        document.querySelector("nav").getBoundingClientRect().height +
        document.getElementById("controls").getBoundingClientRect().height +
        document.getElementById("lowermenu").getBoundingClientRect().height + 2);
      document.getElementById("countries").style.height = menuH + "px";
    },
    resize: function() {
      this.resizeMenu();
      this.draw();
      this.resizing = null;
    },
    readUrl: function() {
      var el, options = {countries: []};
      window.location.hash.slice(1).split(/&/).forEach(function(opt) {
        el = decodeURIComponent(opt).split(/=/);
        if (el[0] === "countries" || el[0] === "places")
          options.countries = el[1] ? el[1].split(/,/) : [];
        else if (el[0] === "country")
          options.scope = el[1];
        else if (el[0] === "alignTo")
          options.alignTo = el[1];
        else if (el[0] === "align")
          options.align = el[1];
        else options[el[0]] = true;
      });
      this.scope = options.scope || "World";
      if (this.init) {
        if (!options.countries.length)
          options.countries = this.scopes[this.scope].countries.filter(function(c) {
            return c.selected;
          }).map(function(c) {
            return c.name;
          });
      }
      if (!options.confirmed && !options.recovered && !options.deceased && !options.currently_sick)
        options.deceased = true;
      this.logarithmic = !!options.log;
      this.multiples = !!options.multiples;
      this.cases.forEach(function(c) {
        c.selected = !!options[c.id] && !c.disabled;
      });
      this.caseChoice = this.case;
      this.countries = this.scopes[this.scope].countries;
      this.countries.forEach(function(c) {
        c.selected = !!~options.countries.indexOf(c.name);
      });
      this.refCountry = options.align || null;
      this.refCase = options.alignTo || "confirmed";
      this.oldrecovered = !!options.oldrecovered;
      if (this.init) {
        this.init = false;
        this.$nextTick(this.resize);
        window.addEventListener("hashchange", this.readUrl);
        window.addEventListener("resize", this.onResize);
      } else this.draw();
    },
    download_data: function() {
      var cacheBypass = new Date().getTime();
      d3.json(
        "data/coronavirus-countries" + (this.oldrecovered ? "-oldrecovered" : "") + ".json?" + cacheBypass,
        this.prepareData
      );
    },
    prepareData: function(data) {
    // WARNING: at startup, url wasn't read yet, so cas here is always deceased then (it does not matter since it is only used to resort existing countries at reload)
      var cas = this.case,
        cases = this.cases,
        scopes = this.scopes,
        scopeChoices = this.scopeChoices = [],
        values = this.values,
        refCountries = this.refCountries,
        defaultPlaces = this.defaultPlaces,
        staticCountriesSort = this.staticCountriesSort,
        levelLabel = this.levelLabel;
      Object.keys(data.scopes).forEach(function(scope) {
        values[scope] = {};
        cases.forEach(function(ca) {
          ca.total[scope] = 0;
        });
        var level = data.scopes[scope].level,
          dates = data.scopes[scope].dates || data.dates,
          countries = Object.keys(data.scopes[scope].values)
          .map(function(c) {
            var maxVals = {},
              lastVals = {},
              cid = c.toLowerCase().replace(/[^a-z]/, '');
            values[scope][cid] = {};
            cases.forEach(function(ca) {
              if (ca.disabled) return;
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
          });
        scopes[scope] = {
          level: level,
          countries: countries,
          dates: dates.map(d3.datize),
          extent: Math.round((dates[dates.length - 1] - dates[0]) / (1000*60*60*24))
        }
        scopes[scope].countries
          .sort(staticCountriesSort(cas, "cases"))
          .forEach(function(c, i) {
            c.color = d3.defaultColors[i % d3.defaultColors.length];
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
      this.lastUpdateStr = new Date(data.last_update*1000).toUTCString();
      this.readUrl();
    },
    levelLabel: function(level) {
      return (level + "s").replace(/ys$/, "ies");
    },
    selectCase: function(newCase) {
      if (!this.multiples) {
        this.caseChoice = newCase;
        this.cases.forEach(function(c) {
          c.selected = (c.id === newCase);
        });
      } else {
        var cas = this.cases.filter(function(c) {
          return c.id === newCase;
        })[0];
        cas.selected = !cas.selected;
      }
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
    alignPlaces: function() {
      var refCountry = this.refCountry;
      if (refCountry && this.scope) {
        var values = this.values[this.scope],
          dates = this.scopes[this.scope].dates,
          refCase = this.refCase,
          refCaseParams = this.refCases.filter(function(c) { return c.id === refCase; })[0],
          refStart = null,
          refId = this.countries.filter(function(c) { return c.name === refCountry; })[0].id,
          refValues = values[refId][refCase];
        this.legend.forEach(function(c) {
          if (c.name === refCountry) {
            c.shift = 0;
            c.shiftStr = "";
          } else {
            var shifts = [],
              ndates = 0;
              curVal = null,
              lastVal = null;
            dates.forEach(function(d, i) {
              if (refValues[i] < refCaseParams.min_cases || ndates > refCaseParams.max_dates) return;
              ndates++;
              for (var j = 1; j < dates.length ; j++) {
                curVal = values[c.id][refCase][j];
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
    draw: function() {
      d3.select(".svg").selectAll("svg").remove();

      this.alignPlaces();
      if (this.multiples) this.drawMultiples();
      else this.drawSeries();

      this.clearTooltip();
    },
    drawMultiples: function() {

      var cas = this.case,
        legend = this.legend,
        values = this.values[this.scope],
        casesLegend = this.casesLegend,
        dates = this.scopes[this.scope].dates.map(function(d) {
          return {
            date: d,
            legend: d3.timeFormat("%a %e %B %Y")(d)
          };
        }),
        logarithmic = this.logarithmic,
        start = dates[0].date,
        end = dates[dates.length - 1].date;
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
        yScale = d3[logarithmic ? "scaleLog" : "scaleLinear"]().range([height, 0]).domain([logarithmic ? 1 : 0, yMax]),
        yPosition = function(c, ca, i) {
          if (logarithmic && values[c][ca][i] == 0)
            return yScale(1);
          return yScale(values[c][ca][i]);
        };
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
              .y(function(d, i) { return yPosition(c.id, cas.id, i); })
            );
          if (columns < 3)
            g.selectAll(".dot." + cas.id + "." + c.id)
            .data(dates)
            .enter()
            .append("circle")
              .attr("class", "dot " + cas.id + " " + c.id)
              .attr("fill", cas.color)
              .attr("cx", function(d) { return xScale(d.date); })
              .attr("cy", function(d, i) { return yPosition(c.id, cas.id, i); })
              .attr("r", 4 - columns);
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
          .selectAll("rect.tooltip.surface")
          .data(dates).enter().append("rect")
            .classed("tooltip", true)
            .classed("surface", true)
            .attr("did", function(d, i) { return i; })
            .attr("country", c.id)
            .attr("x", xPosition)
            .attr("y", yScale.range()[1])
            .attr("width", xWidth)
            .attr("height", yScale.range()[0] - yScale.range()[1])
            .on("mouseover", hover)
            .on("mousemove", displayTooltip)
            .on("mouseleave", clearTooltip);
        g.append("g")
          .selectAll("rect.tooltip.hoverdate")
          .data(dates).enter().append("rect")
            .classed("tooltip", true)
            .classed("hoverdate", true)
            .attr("did", function(d, i) { return i; })
            .attr("country", c.id)
            .attr("x", function(d) { return xPosition(d) + xWidth / 2 - 1; })
            .attr("y", yScale.range()[1])
            .attr("width", 2)
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

      // Filter dates from zoom
      var values = this.values[this.scope],
        dates = this.scopes[this.scope].dates,
        cas = this.case,
        logarithmic = this.logarithmic,
        hiddenLeft = this.hiddenLeft,
        hiddenRight = this.hiddenRight,
        zoomedDates = dates.slice(hiddenLeft, dates.length - hiddenRight).map(function(d) {
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
          .domain([logarithmic ? 1 : 0, yMax]),
        yPosition = function(c, d, i) {
          var val = shiftedVal(c, d, i);
          if (logarithmic && val == 0)
            return yScale(1);
          return yScale(val);
        };

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
            .y(function(d, i) { return yPosition(c, d, i); })
          );

        g.selectAll(".dot." + c.id)
          .data(shiftedDates(c))
          .enter()
          .append("circle")
            .attr("class", "dot " + c.id)
            .attr("fill", c.color)
            .attr("cx", function(d) { return xScale(d.date); })
            .attr("cy", function(d, i) { return yPosition(c, d, i); })
            .attr("r", 3);
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
        .selectAll("rect.tooltip.surface")
        .data(zoomedDates).enter().append("rect")
          .classed("surface", true)
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
      g.append("g")
        .selectAll("rect.tooltip.surface")
        .data(zoomedDates).enter().append("rect")
          .classed("tooltip", true)
          .classed("hoverdate", true)
          .attr("did", function(d, i) { return i; })
          .attr("x", function(d) { return xPosition(d) + xWidth / 2 - 1; })
          .attr("y", yScale.range()[1])
          .attr("width", 2)
          .attr("height", yScale.range()[0] - yScale.range()[1])
          .on("mouseover", this.hover)
          .on("mousemove", this.displayTooltip)
          .on("mouseleave", this.clearTooltip)
          .on("wheel", this.zoom)
          .on("dblclick", this.zoom);

    },
    hover: function(d, i) {
      d3.selectAll('rect.hoverdate[did="' + i + '"]').style("fill-opacity", 0.25);
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
          else c.value = d3.strFormat(val);
        });
      } else {
        var country = d3.select(rects[i]).attr('country');
        this.cases.forEach(function(c) {
          if (!c.disabled)
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
        c.value = (multiples && legend.length == 1 && !c.disabled ? d3.strFormat(legend[0].lastValues[c.id]) : null);
      });
      this.$forceUpdate();
      d3.selectAll('rect.hoverdate[did="' + i + '"]').style("fill-opacity", 0);
      d3.select(".tooltipBox").style("display", "none");
    },
    hoverCase: function(cas, hov) {
      if (this.multiples && cas.selected) {
        d3.selectAll(".line." + cas.id).classed("hover", hov);
        if (hov) document.querySelectorAll("." + cas.id)
        .forEach(function(d) {
          d.parentNode.appendChild(d);
        });
      }
    },
    hoverCountry: function(c, hov) {
      d3.select("#" + c).classed("hover", hov);
      if (hov) document.querySelectorAll("#" + c + ", .dot." + c)
      .forEach(function(d) {
        d.parentNode.appendChild(d);
      });
    },
    zoom: function(d, i, rects) {
      var direction = (d3.event.deltaY && d3.event.deltaY > 0 ? -1 : 1),
        days = this.curExtent / 3,
        gauge = (i + 1) / rects.length,
        gaugeLeft = (gauge > 0.05 ? gauge : 0),
        gaugeRight = (gauge < 0.95 ? 1 - gauge : 0);
      if (direction == 1 && this.scopes[this.scope].extent - this.hiddenLeft - this.hiddenRight < 15) return;
      this.clearTooltip();
      this.hiddenLeft += Math.floor(gaugeLeft * days * direction);
      this.hiddenRight += Math.floor(gaugeRight * days * direction);
      if (this.hiddenLeft < 0) this.hiddenLeft = 0;
      if (this.hiddenRight < 0) this.hiddenRight = 0;
      this.draw();
      this.displayTooltip(d, i, rects);
    },
    exportData: function() {
      var a = document.createElement('a'),
        file = "coronavirus-countries" + (this.oldrecovered ? "-oldrecovered" : "") + ".json";
      a.href = "data/" + file;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
});
