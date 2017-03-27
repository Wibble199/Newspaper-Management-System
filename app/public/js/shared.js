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

Date.prototype.toYYYYMMDD = function(separator) {
	var m = this.getMonth() + 1, d = this.getDate();
	return [
		this.getFullYear(),
		(m < 10 ? "0" : "") + m,
		(d < 10 ? "0" : "") + d
	].join(separator);
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