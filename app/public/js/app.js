var vm = new Vue({
	el: '#app',

	data: {
		// Main data
		user: {},
		subscriptions: [],
		suspensions: [],

		// Client only data
		subscriptionEditId: -1,

		endDateDisabled: true
	},

	mounted: function() {
		this.fetchUser();
		this.fetchSubscriptions();
		this.fetchSuspensions();
	},

	methods: {
		fetchUser: function() {
			var thisVue = this;
			$.getJSON('/user').done(function(d) {
				thisVue.$data.user = d.user;
			});
		},

		// --------------------- //
		// Subscription methods //
		// ------------------- //
		fetchSubscriptions: function() {
			var thisVue = this;
			$.getJSON('/subscriptions').done(function(d) {
				thisVue.$data.subscriptions = d.results;
			});
		},

		// Adds or edits the current form data in the modal
		saveSubscription: function() {
			var thisVue = this;
			var isUpdate = thisVue.$data.subscriptionEditId > 0; // True if updating existing subscription, false if adding new

			$('#edit-subscription-mdl .modal-content').loadingOverlay(true);
			
			$.ajax({
				url: '/subscriptions' + (isUpdate ? "/" + thisVue.$data.subscriptionEditId : ""),
				method: isUpdate ? "PUT" : "POST",
				data: $.param(getSubscriptionFormVal())

			}).done(function(d) {
				if (d.success)
					return $.getJSON('/subscriptions/' + (isUpdate ? thisVue.$data.subscriptionEditId : d.id)).done(function(d) {
						console.log(d);
						if (isUpdate) {
							// If updating existing subscription, find the index of that subscription (NOT the same as its ID) and update that object
							for (var i = thisVue.$data.subscriptions.length; i--;) {
								if (thisVue.$data.subscriptions[i].id == thisVue.$data.subscriptionEditId) {
									thisVue.$set(thisVue.$data.subscriptions, i, d.result); // Cannot use `thisVue.$data.subscriptions[i] = d.result` as this changes the reference and the binding breaks
									break;
								}
							}
						} else {
							// If adding new subscription, simply push it onto the subscription list
							thisVue.$data.subscriptions.push(d.result);
						}

						$('#edit-subscription-mdl').modal("hide");
						$('#edit-subscription-mdl .modal-content').loadingOverlay(false);
					});

			}).fail(function(err) {
				console.error(err);
			});
		},

		// Handler for delete button to delete the clicked subscription
		deleteSubscription: function(e) {
			var thisVue = this;
			var targetLi = $(e.currentTarget).closest('[data-subscription-id]');
			var subscriptionId = targetLi.data('subscription-id'), subscriptionIndex = targetLi.index();

			if (confirm("Are you sure?")) {
				targetLi.loadingOverlay(true);

				$.ajax({
					url: '/subscriptions/' + subscriptionId,
					method: "DELETE"

				}).done(function(d) {
					if (d.success)
						thisVue.$data.subscriptions.splice(subscriptionIndex, 1);

				}).fail(function(err) {
					alert("Failed to delete: " + err);
				});
			}
		},

		openSubscriptionModal: function(id) {
			this.$data.subscriptionEditId = id;
			$('#edit-subscription-mdl').modal("show");

			var selectedModel = {};
			if (id > 0) {
				for (var i = this.$data.subscriptions.length; i--;) {
					if (this.$data.subscriptions[i].id == id) {
						selectedModel = this.$data.subscriptions[i];
						break;
					}
				}
			}

			$('[data-subscription-binding="publication_id"]').val(selectedModel.publication_id);
			$('[data-subscription-binding="start_date"]').datepicker('update', new Date(selectedModel.start_date));
			$('[data-subscription-binding="end_date"]').datepicker('update', selectedModel.end_date == null ? null : new Date(selectedModel.end_date));
			vm.$data.endDateDisabled = selectedModel.end_date == null;
			deliveryDaysSet(selectedModel.delivery_days);
		},

		// ------------------- //
		// Suspension methods //
		// ----------------- //
		fetchSuspensions: function() {
			var thisVue = this;
			$.getJSON('/suspensions').done(function(d) {
				thisVue.$data.suspensions = d.results;
			});
		},

		// ----- //
		// Misc //
		// --- //
		// Takes a delivery_days number and returns a HTML string in the form SMTWTFS with strikethrough on letters that are inactive
		getDayString: function(num) {
			var html = "";
			var days = "SMTWTFS";
			for (var i = 0; i < 7; i++) {
				var dayVal = Math.pow(2, i);
				var tagName = (num & dayVal) == dayVal ? "b" : "s";
				html += (i == 0 ? "" : " " /*Add a space on all but first*/) + "<" + tagName + ">" + days[i] + "</" + tagName + ">";
			}
			return html;
		}
	}
});

var monthlyOptions = {
	stylePast: true,
	eventList: false,
	dataType: "json",
	jsonUrl: "/events.json", /* /events/{year}/{month} */

	onStartFetch: function() { $('#main-calendar').loadingOverlay(true); },
	onFinishFetch: function() { $('#main-calendar').loadingOverlay(false); }
};

$(function() {
	$('input[data-date-type]').datepicker({
		autoclose: true,
		format: "dd/mm/yyyy",
		todayHighlight: true
	});

	$('#main-calendar').monthly(monthlyOptions);
});

function reloadMonthlyCurrent() {
	$('#main-calendar').monthly($.extend({reloadEvents: true}, monthlyOptions));
}

function getSubscriptionFormVal() {
	var model = {};

	model.publication_id = $('[data-subscription-binding="publication_id"]').val();
	model.start_date = dateConverter_yyyymmdd($('[data-subscription-binding="start_date"]').val());
	if (!vm.$data.endDateDisabled)
		model.end_date = dateConverter_yyyymmdd($('[data-subscription-binding="end_date"]').val());
	model.delivery_days = deliveryDaysGet();

	return model;
}

function dateConverter_yyyymmdd(ddmmyyyy) {
	if (ddmmyyyy == null || ddmmyyyy == "") return "";
	var parts = ddmmyyyy.split("/");
	return parts[2] + "-" + parts[1] + "-" + parts[0];
}

// Functions to get and set value for the delivery days checkboxes
function deliveryDaysGet() {
	var sum = 0;
	$('[data-subscription-binding="delivery_days"] input[type="checkbox"]:checked').each(function() {
		sum += +$(this).val();
	});
	return sum;
}

function deliveryDaysSet(val) {
	$('[data-subscription-binding="delivery_days"] input[type="checkbox"]').each(function() {
		var $this = $(this), thisVal = $(this).val();
		$this.prop('checked', (val & thisVal) == thisVal);
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

function createAlert(type, title, message) {

}