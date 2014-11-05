var $ = require("jquery"),
	yutils = require("yasgui-utils"),
	imgs = require('./imgs.js');
require("../lib/DataTables/media/js/jquery.dataTables.js");



/**
 * Constructor of plugin which displays results as a table
 * 
 * @param yasr {object}
 * @param parent {DOM element}
 * @param options {object}
 * @class YASR.plugins.table
 * @return yasr-table (doc)
 * 
 */
var root = module.exports = function(yasr) {
	var table = $('<table cellpadding="0" cellspacing="0" border="0" class="resultsTable"></table>');
	var options = $.extend(true, {}, root.defaults);
	
	var getVariablesAsCols = function() {
		var cols = [];
		cols.push({"title": ""});//row numbers
		var sparqlVars = yasr.results.getVariables();
		for (var i = 0; i < sparqlVars.length; i++) {
			cols.push({"title": sparqlVars[i]});
		}
		return cols;
	};
	

	var getRows = function() {
		var rows = [];
		var bindings = yasr.results.getBindings();
		var vars = yasr.results.getVariables();
		var usedPrefixes = null;
		if (yasr.options.getUsedPrefixes) {
			usedPrefixes = (typeof yasr.options.getUsedPrefixes == "function"? yasr.options.getUsedPrefixes(yasr):  yasr.options.getUsedPrefixes);
		}
		for (var rowId = 0; rowId < bindings.length; rowId++) {
			var row = [];
			row.push("");//row numbers
			var binding = bindings[rowId];
			for (var colId = 0; colId < vars.length; colId++) {
				var sparqlVar = vars[colId];
				if (sparqlVar in binding) {
					if (options.drawCellContent) {
						row.push(options.drawCellContent(rowId, colId, binding[sparqlVar], usedPrefixes));
					} else {
						row.push("");
					}
				} else {
					row.push("");
				}
			}
			rows.push(row);
		}
		return rows;
	};
	

	var addEvents = function() {
		table.on( 'order.dt', function () {
		    drawSvgIcons();
		});
		$.extend(true, options.callbacks, options.handlers);
		table.delegate("td", "click", function(event) {
			if (options.callbacks && options.callbacks.onCellClick) {
				var result = options.callbacks.onCellClick(this, event);
				if (result === false) return false;
			}
		}).delegate("td",'mouseenter', function(event) {
			if (options.callbacks && options.callbacks.onCellMouseEnter) {
				options.callbacks.onCellMouseEnter(this, event);
			}
			var tdEl = $(this);
			if (options.fetchTitlesFromPreflabel 
					&& tdEl.attr("title") === undefined
					&& tdEl.text().trim().indexOf("http") == 0) {
				addPrefLabel(tdEl);
			}
		}).delegate("td",'mouseleave', function(event) {
			if (options.callbacks && options.callbacks.onCellMouseLeave) {
				options.callbacks.onCellMouseLeave(this, event);
				
			}
		});
	};
	
	var draw = function() {
		$(yasr.resultsContainer).html(table);

		var dataTableConfig = options.datatable;
		dataTableConfig.data = getRows();
		dataTableConfig.columns = getVariablesAsCols();
		table.DataTable($.extend(true, {}, dataTableConfig));//make copy. datatables adds properties for backwards compatability reasons, and don't want this cluttering our own 
		
		
		drawSvgIcons();
		
		addEvents();
		
		//move the table upward, so the table options nicely aligns with the yasr header
		var headerHeight = yasr.header.outerHeight() - 5; //add some space of 5 px between table and yasr header
		if (headerHeight > 0) {
			yasr.resultsContainer.find(".dataTables_wrapper")
			.css("position", "relative")
			.css("top", "-" + headerHeight + "px")
			.css("margin-bottom", "-" + headerHeight + "px");
		}
		
		
	};
	
	var drawSvgIcons = function() {
		var sortings = {
			"sorting": "unsorted",
			"sorting_asc": "sortAsc",
			"sorting_desc": "sortDesc"
		};
		table.find(".sortIcons").remove();
		var width = 8;
		var height = 13;
		for (var sorting in sortings) {
			var svgDiv = $("<div class='sortIcons'></div>").css("float", "right").css("margin-right", "-12px").width(width).height(height);
			yutils.svg.draw(svgDiv, imgs[sortings[sorting]], {width: width+2, height: height+1});
			table.find("th." + sorting).append(svgDiv);
		}
	};
	/**
	 * Check whether this plugin can handler the current results
	 * 
	 * @property canHandleResults
	 * @type function
	 * @default If resultset contains variables in the resultset, return true
	 */
	var canHandleResults = function(){
		return yasr.results && yasr.results.getVariables() && yasr.results.getVariables().length > 0;
	};

	
	var getDownloadInfo = function() {
		if (!yasr.results) return null;
		return {
			getContent: function(){return require("./bindingsToCsv.js")(yasr.results.getAsJson());},
			filename: "queryResults.csv",
			contentType: "text/csv",
			buttonTitle: "Download as CSV"
		};
	};
	
	return {
		name: "Table",
		draw: draw,
		getPriority: 10,
		getDownloadInfo: getDownloadInfo,
		canHandleResults: canHandleResults,
	}
};



var getFormattedValueFromBinding = function(rowId, colId, binding, usedPrefixes) {
	var value = null;
	if (binding.type == "uri") {
		var href = visibleString = binding.value;
		if (usedPrefixes) {
			for (var prefix in usedPrefixes) {
				if (visibleString.indexOf(usedPrefixes[prefix]) == 0) {
					visibleString = prefix + href.substring(usedPrefixes[prefix].length);
					break;
				}
			}
		}
		value = "<a class='uri' target='_blank' href='" + href + "'>" + visibleString + "</a>";
	} else {
		var stringRepresentation = binding.value;
		if (binding["xml:lang"]) {
			stringRepresentation = '"' + binding.value + '"@' + binding["xml:lang"];
		} else if (binding.datatype) {
			var xmlSchemaNs = "http://www.w3.org/2001/XMLSchema#";
			var dataType = binding.datatype;
			if (dataType.indexOf(xmlSchemaNs) == 0) {
				dataType = "xsd:" + dataType.substring(xmlSchemaNs.length);
			} else {
				dataType = "<" + dataType + ">";
			}
			
			stringRepresentation = '"' + stringRepresentation + '"^^' + dataType;
		}
		
		value = "<span class='nonUri'>" + stringRepresentation + "</span>";
	}
	return value;
};






var addPrefLabel = function(td) {
	var addEmptyTitle = function() {
		td.attr("title","");//this avoids trying to fetch the label again on next hover
	};
	$.get("http://preflabel.org/api/v1/label/" + encodeURIComponent(td.text()) + "?silent=true")
		.success(function(data) {
			if (typeof data == "object" && data.label) {
				td.attr("title", data.label);
			} else if (typeof data == "string" && data.length > 0 ) {
				td.attr("title", data);
			} else {
				addEmptyTitle();
			}
			
		})
		.fail(addEmptyTitle);
};

var openCellUriInNewWindow = function(cell) {
	if (cell.className.indexOf("uri") >= 0) {
		window.open(this.innerHTML);
	}
};

/**
 * Defaults for table plugin
 * 
 * @type object
 * @attribute YASR.plugins.table.defaults
 */
root.defaults = {
	
	/**
	 * Draw the cell content, from a given binding
	 * 
	 * @property drawCellContent
	 * @param binding {object}
	 * @type function
	 * @return string
	 * @default YASR.plugins.table.getFormattedValueFromBinding
	 */
	drawCellContent: getFormattedValueFromBinding,
	
	/**
	 * Try to fetch the label representation for each URI, using the preflabel.org services. (fetching occurs when hovering over the cell)
	 * 
	 * @property fetchTitlesFromPreflabel
	 * @type boolean
	 * @default true
	 */
	fetchTitlesFromPreflabel: true,
	/**
	 * Set a number of handlers for the table
	 * 
	 * @property handlers
	 * @type object
	 */
	callbacks: {
		/**
		 * Mouse-enter-cell event
		 * 
		 * @property handlers.onCellMouseEnter
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellMouseEnter: null,
		/**
		 * Mouse-leave-cell event
		 * 
		 * @property handlers.onCellMouseLeave
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellMouseLeave: null,
		/**
		 * Cell clicked event
		 * 
		 * @property handlers.onCellClick
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellClick: null
	},
	/**
	 * This plugin uses the datatables jquery plugin (See datatables.net). For any datatables specific defaults, change this object. 
	 * See the datatables reference for more information
	 * 
	 * @property datatable
	 * @type object
	 */
	datatable: {
		"order": [],//disable initial sorting
		"pageLength": 50,//default page length
    	"lengthMenu": [[10, 50, 100, 1000, -1], [10, 50, 100, 1000, "All"]],//possible page lengths
    	"lengthChange": true,//allow changing page length
    	"pagingType": "full_numbers",//how to show the pagination options
        "drawCallback": function ( oSettings ) {
        	//trick to show row numbers
        	for ( var i = 0; i < oSettings.aiDisplay.length; i++) {
				$('td:eq(0)',oSettings.aoData[oSettings.aiDisplay[i]].nTr).html(i + 1);
			}
        	
        	//Hide pagination when we have a single page
        	var activePaginateButton = false;
        	$(oSettings.nTableWrapper).find(".paginate_button").each(function() {
        		if ($(this).attr("class").indexOf("current") == -1 && $(this).attr("class").indexOf("disabled") == -1) {
        			activePaginateButton = true;
        		}
        	});
        	if (activePaginateButton) {
        		$(oSettings.nTableWrapper).find(".dataTables_paginate").show();
        	} else {
        		$(oSettings.nTableWrapper).find(".dataTables_paginate").hide();
        	}
		},
		"columnDefs": [
			{ "width": "12px", "orderable": false, "targets": 0  }//disable row sorting for first col
		],
	},
};

root.version = {
	"YASR-table" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"jquery-datatables": $.fn.DataTable.version
};
