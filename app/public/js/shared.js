function ajax(options) {
	return new Promise(function(resolve, reject) {
		$.ajax(options)
			.done(function(dat) { resolve(dat); })
			.fail(function(err) { reject(err); });
	});
}

(function($) {
	$.fn.loadingOverlay = function(enable) {
		$.each(this, function() {
			var $this = $(this);

			if (enable) {
				if ($this.children('.loading-overlay').length == 0)
					$this.append('<div class="loading-overlay"><div class="loading-icon"></div></div>');
			} else
				$this.children('.loading-overlay').remove();
			
		});

		return this;
	}
})(jQuery);

// Returns date in format YYYY-MM-DD with a specified parameter
Date.prototype.toYYYYMMDD = function(separator) {
	var m = this.getMonth() + 1, d = this.getDate();
	return [
		this.getFullYear(),
		(m < 10 ? "0" : "") + m,
		(d < 10 ? "0" : "") + d
	].join(separator || "-");
}

// Bootstrap modal function
function messageBox(options) {
	options = $.extend({}, {
		title: "Alert",
		text: "Something has happened.",
		callback: null,
		closeBtn: true,
		keyboard: true,
		backdrop: true,
		buttons: [{
			label: "Ok",
			type: "primary"
		}],
		container: 'body'
		// defaults
	}, options);

	// Main modal markup
	var $modal = $(
	'<div class="modal fade">' +
		'<div class="modal-dialog">' +
			'<div class="modal-content">' + 
				'<div class="modal-header">' +
	(options.closeBtn ? '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span></button>' : '') +
				'<h4 class="modal-title">' + options.title + '</h4>' +
				'</div>' +
				'<div class="modal-body">' +
					'<p>' + options.text + '</p>' + 
				'</div>' +
				'<div class="modal-footer"></div>' +
			'</div>' +
		'</div>' +
	'</div>');

	// Events
	var modalOnHide;
	$modal.on('hide.bs.modal', modalOnHide = function(e) {
		if (typeof options.callback == "function" && options.callback.call($modal, -1, null) === false) { 
			e.preventDefault(); // If the callback returned false, cancel the closing
			return false;
		}
	});

	$modal.on('hidden', function() {
		$modal.remove();
	});

	// Function to remove callback before hiding modal
	var hideModal = function() {
		$modal.off('hide.bs.modal', modalOnHide);
		$modal.modal("hide");
	}

	// Buttons
	var $btnCont = $modal.find('.modal-footer');
	for (var i = 0; i < options.buttons.length; i++) {
		var $btn = $('<button type="button" class="btn btn-' + (options.buttons[i].type || 'primary') + '">' + (options.buttons[i].label || '') + '</button>');
		$btn.on('click', (function(i, $btn) {
			return function() {
				if (typeof options.callback == "function") {
					if (options.callback.call($modal, i, $btn) !== false)
						hideModal();
				} else
					hideModal();
			}
		})(i, $btn));
		$btnCont.append($btn);
	}

	// Add to DOM and show
	$modal.appendTo($(options.container)).modal({
		show: true,
		keyboard: options.keyboard,
		backdrop: options.backdrop
	});
}

// Returns an easily-readable full string for a date with HTML sup tags (e.g. `4<sup>th</sup> May 2017`)
// Can optionally return without HTML tags
function fullDateStr(d, htmlTags) {
	var dateSuffix = "th";
	switch(d.getDate()) {
		case 1: case 21: case 31: dateSuffix = "st"; break;
		case 2: case 22: dateSuffix = "nd"; break;
		case 3: case 23: dateSuffix = "rd"; break;
	}

	return d.getDate() + (htmlTags === false ? "" : "<sup>") + dateSuffix + (htmlTags === false ? " " : "</sup> ") +
		["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] + " " +
		d.getFullYear();
}

// Gets the first monday of an ISO8601 week
// Returns a date object
function iso8601Week(w, y) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

// Calculates a date range for a given week year and number week in format "YYYY-MM"
// Defaults to using HTML tags/entites (<sup> and &ndash;) but can be disabled by provided useHtml = false
function weekToDaterange(week, useHtml) {
	week = week.split("-");
	var y = +week[0], w = +week[1];
	var d = iso8601Week(w, y);
	d.setDate(d.getDate() - 1); // Since we start at Sunday because I'm an idiot, take one off that day
	var startStr = fullDateStr(d, useHtml);
	d.setDate(d.getDate() + 6);
	return startStr + (useHtml === false ? " – " : " &ndash; ") + fullDateStr(d, useHtml);
}