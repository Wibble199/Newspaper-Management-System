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