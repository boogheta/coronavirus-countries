/* TODO
*/

d3.formatDefaultLocale({
  "decimal": ".",
  "thousands": " ",
  "grouping": [3],
  "currency": ["", ""],
});
d3.defaultColors = ["#9FA8DA", "#CE93D8", "#DEA3E8", "#FFAB91", "#FFE082", "#A5D6A7", "#80DEEA"]
d3.datize = function(d) {
  var dt = new Date(d);
  dt.setHours(0);
  return dt;
}
d3.nextDate = function(d) {
  var dt = d3.datize(d);
  dt.setDate(dt.getDate() + 1);
  return dt;
}
d3.startDate = function(countries) {
  return d3.min(countries.map(function(a) {
    if (a.transactions.length)
      return new Date(a.transactions[0].date);
     return new Date();
  }));
}

new Vue({
  el: "#corona",
  data: {
    countries: [],
    dates: [],
    values: null,
    cases: [
      {id: "confirmed",  selected: true,   total: 0},
      {id: "recovered",  selected: false,  total: 0},
      {id: "dead",       selected: false,  total: 0},
      {id: "sick",       selected: false,  total: 0}
    ],
    logarithmic: false,
    compare: false,
    resizing: null,
 /*   hoverDate: "",
    curView: null,
    curExtent: null,
    hiddenLeft: 0,
    hiddenRight: 0, */
    help: false
  },
  computed: {
    case: function() {
      return (this.cases.filter(function(c) { return c.selected; })[0] || {id: null}).id;
    },
    url: function() {
      return this.case +
        "&countries="+this.countries.filter(function(a) { return a.selected; })
        .map(function(a) { return a.name; }).join(",") +
        (this.logarithmic ? "&log" : "") +
        (this.compare ? "&compare" : "");
    },
    legende: function() {
      return this.countries.filter(function(a) { return a.selected; });
    }
  },
  watch: {
    url: function(newValue) {
      window.location.hash = newValue;
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
      this.resizing = setTimeout(this.draw, 50);
    },
    readUrl: function() {
        //TODO handle other url settings
      var el, options = {}, selected = [];
      window.location.hash.slice(1).split(/&/).forEach(function(opt) {
        el = decodeURIComponent(opt).split(/=/);
        if (el[0] === "countries") {
          selected = el[1].split(/,/);
        } else options[el[0]] = el[1];
      });
      this.countries.forEach(function(c) { if (~selected.indexOf(c.id)) { c.selected = true; }});
      this.$nextTick(this.draw);
    },
    download_data: function() {
      var cacheBypass = new Date().getTime();
      d3.json(
        "data/coronavirus-countries.json?" + cacheBypass,
        this.prepareData
      );
    },
    prepareData: function(data) {
      var cases = this.cases;
      this.countries = Object.keys(data.values)
        .sort()
        .map(function(c) {
          cases.forEach(function(cas) {
            cas.total += data.values[c][cas.id][data.dates.length - 1];
          });
          return {
            id: c,
            name: c,
            color: "",
            flag: "",
            value: null,
            selected: false
          };
        });
      cases.forEach(function(cas) {
        cas.total = d3.format(",d")(cas.total);
      });
      this.values = data.values;
      this.dates = data.dates.map(d3.datize);
      console.log(data);
      this.readUrl();
    },
    selectCase: function(newCase) {
      if (!this.compare)
        this.cases.forEach(function(c) {
          c.selected = c.id === newCase;
        });
      else {

      }
    },
    draw: function() {
      d3.select(".svg").selectAll("svg").remove();

      var start = this.dates[0],
        end = this.dates[this.dates.length - 1],
      //this.end.setDate(this.end.getDate() + 1);
      //extent = Math.round((this.end - this.start) / (1000*60*60*24)),
      //d3.timeDay.range(start, end).forEach(function(d) {
        dates = this.dates.map(function(d) {
          return {
            date: d,
            legend: d3.timeFormat("%a %e %B %Y")(d)
          };
        });

      // TODO: Filter from zoom 
  /*    var start = d3.startDate(this.legende),
        end = new Date(),
        data = [];
      this.curExtent = Math.round((end - start) / (1000*60*60*24));
      start.setDate(start.getDate() + this.hiddenLeft);
      end.setDate(end.getDate() + 1 - this.hiddenRight);
      this.data.slice(this.hiddenLeft, this.data.length - this.hiddenRight)
      .forEach(function(d) {
        if (d.date < start || d.date > end) return;
        data.push(d);
      });
      this.curView = Math.round((end - start) / (1000*60*60*24));
*/

      // Setup dimensions
      var values = this.values,
        typ = this.case,
        logarithmic = this.logarithmic,
        margin = {top: 20, right: 90, bottom: 25, left: 60},
        svgW = window.innerWidth - document.querySelector("aside").getBoundingClientRect().width,
        width = svgW - margin.left - margin.right,
        mainH = window.innerHeight - document.querySelector("nav").getBoundingClientRect().height - document.getElementById("legende").getBoundingClientRect().height,
        svgH = Math.max(140, mainH),
        height = svgH - margin.top - margin.bottom,
        xScale = d3.scaleTime().range([0, width]).domain([start, end]),
        xPosition = function(d) { return xScale(d3.max([start, d.date || d.data.date])); },
        xWidth = function(d) { return Math.max(0.01, xScale(d3.min([end, d3.nextDate(d.date || d.data.date)])) - xPosition(d)); },
        maxValues = this.legende.map(function(c) { return d3.max(values[c.name][typ])}),
        yMax = Math.max(0, d3.max(maxValues)),
        yScale = d3[logarithmic ? "scaleLog" : "scaleLinear"]().range([height, 0]).domain([logarithmic ? 1 : 0, yMax]);

      this.legende.forEach(function(a, i) { a.color = d3.defaultColors[i]; });

      // Prepare svg
      var g = d3.select(".svg")
      .style("height", mainH+"px")
      .append("svg")
        .attr("width", svgW)
        .attr("height", svgH)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Draw series
      this.legende.forEach(function(c) {
        g.append("path")
          .datum(dates)
          .attr("fill", "none")
          .attr("stroke", c.color)
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .attr("stroke-width", 2)
          .attr("d", d3.line()
            .x(function(d) { return xScale(d.date); })
            .y(function(d, i) {
              if (logarithmic && !values[c.name][typ][i])
                return yScale(1);
              return yScale(values[c.name][typ][i]);
            })
          );
      });

      // Draw axis
      g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0, " + (height) + ")")
        .call(d3.axisBottom(xScale).ticks(10, d3.timeFormat("%d %b %y")).tickSizeOuter(0));
      g.append("g")
        .attr("class", "axis axis--y")
        .attr("transform", "translate(" + (width) + ", 0)")
        .call(d3.axisRight(yScale).ticks(20, d3.format(",d")).tickSizeOuter(0));

   /*   // Draw tooltips surfaces
      g.append("g")
        .selectAll("rect.tooltip")
        .data(data).enter().append("rect")
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

      this.clearTooltip();
*/
      this.resizing = null;
    },
 /*   hover: function(d, i) {
      d3.selectAll('rect[did="' + i + '"]').style("fill-opacity", 0.25);
    },
    displayTooltip: function(d, i, rects) {
      this.hoverDate = d.legend;
      this.legende.forEach(function(l) {
        l.value = d[l.name];
      });
      d3.select(".tooltipBox")
      .style("left", d3.event.pageX - 60 + "px")
      .style("top", d3.event.pageY + 20 + "px")
      .style("display", "block");
    },
    clearTooltip: function(d, i) {
      this.legende.forEach(function(l) {
        l.value = null;
      });
      if (i) d3.selectAll('rect[did="' + i + '"]').style("fill-opacity", 0);
      d3.select(".tooltipBox").style("display", "none");
    },
    zoom: function(d, i, rects) {
      var direction = (d3.event.deltaY && d3.event.deltaY > 0 ? -1 : 1),
        days = this.curView / 3,
        gauge = (i + 1) / rects.length,
        gaugeLeft = (gauge > 0.05 ? gauge : 0),
        gaugeRight = (gauge < 0.95 ? 1 - gauge : 0);
      if (direction == 1 && this.curExtent - this.hiddenLeft - this.hiddenRight < 35) return;
      this.clearTooltip();
      this.hiddenLeft += Math.floor(gaugeLeft * days * direction);
      this.hiddenRight += Math.floor(gaugeRight * days * direction);
      if (this.hiddenLeft < 0) this.hiddenLeft = 0;
      if (this.hiddenRight < 0) this.hiddenRight = 0;
      this.draw();
      this.displayTooltip(d, i, rects);
    }, */
    exportData: function() {
      let a = document.createElement('a');
      a.href = "data/coronavirus-countries.json";
      a.download = "coronavirus-countries.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
});
