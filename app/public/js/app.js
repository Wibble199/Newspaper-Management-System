var vm = new Vue({
	el: '#app',

	data: {
		// Main data
		user: {},
		publications: [],
		subscriptions: [],
		suspensions: [],

		// Client only data
		subscriptionEditId: -1,
		suspensionEditId: -1,

		endDateDisabled: true
	},

	mounted: function() {
		this.fetchUser();
		this.fetchPublications();
		this.fetchSubscriptions();
		this.fetchSuspensions();
	},

	methods: {
		fetchUser: function() {
			var thisVue = this;
			ajax('/user').then(function(d) {
				thisVue.$data.user = d.user;
			});
		},

		// --------------------- //
		// Subscription methods //
		// ------------------- //
		fetchPublications: function() {
			var thisVue = this;
			ajax('/publications').then(function(d) {
				thisVue.$data.publications = d.results;
			})
		},

		fetchSubscriptions: function() {
			var thisVue = this;
			ajax('/subscriptions').then(function(d) {
				thisVue.$data.subscriptions = convertDates(d.results);
			});
		},

		// Adds or edits the current form data in the modal
		saveSubscription: function() {
			var thisVue = this;
			var isUpdate = thisVue.$data.subscriptionEditId > 0; // True if updating existing subscription, false if adding new

			$('#edit-subscription-mdl .modal-content').loadingOverlay(true);
			
			ajax({
				url: '/subscriptions' + (isUpdate ? "/" + thisVue.$data.subscriptionEditId : ""),
				method: isUpdate ? "PUT" : "POST",
				data: $.param(getSubscriptionFormVal())

			}).then(function(d) {
				if (d.success)
					return ajax('/subscriptions/' + (isUpdate ? thisVue.$data.subscriptionEditId : d.id));
				else
					throw d.err || "Unknown error occured";
				
			}).then(function(d) {
				if (isUpdate) {
					// If updating existing subscription, find the index of that subscription (NOT the same as its ID) and update that object
					for (var i = thisVue.$data.subscriptions.length; i--;) {
						if (thisVue.$data.subscriptions[i].id == thisVue.$data.subscriptionEditId) {
							thisVue.$set(thisVue.$data.subscriptions, i, convertDateObj(d.result)); // Cannot use `thisVue.$data.subscriptions[i] = d.result` as this changes the reference and the binding breaks
							break;
						}
					}
				} else {
					// If adding new subscription, simply push it onto the subscription list
					thisVue.$data.subscriptions.push(d.result);
				}

				$('#edit-subscription-mdl').modal("hide");
				$('#edit-subscription-mdl .modal-content').loadingOverlay(false);
				reloadMonthlyCurrent();

			}).catch(function(err) {
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

				ajax({
					url: '/subscriptions/' + subscriptionId,
					method: "DELETE"

				}).then(function(d) {
					if (d.success)
						thisVue.$data.subscriptions.splice(subscriptionIndex, 1);

				}).catch(function(err) {
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
			$('[data-subscription-binding="start_date"]').datepicker('setDate', selectedModel.start_date);
			$('[data-subscription-binding="end_date"]').datepicker('setDate', selectedModel.end_date == null ? null : selectedModel.end_date);
			vm.$data.endDateDisabled = selectedModel.end_date == null;
			deliveryDaysSet(selectedModel.delivery_days);
		},

		// ------------------- //
		// Suspension methods //
		// ----------------- //
		fetchSuspensions: function() {
			var thisVue = this;
			ajax('/suspensions').then(function(d) {
				thisVue.$data.suspensions = convertDates(d.results);
			});
		},

		insertSuspension: function() {
			var defaultStartDate = new Date();
			this.$data.suspensions.push({
				id: 0,
				customer_id: null,
				start_date: defaultStartDate,
				end_date: defaultStartDate
			});

			// If not done on the next tick, the values for the inputs are invalid and it does not enter edit mode immediately
			Vue.nextTick(function() { this.editModeSuspension($('[data-suspension-id="0"]')); }, this);
		},

		editModeSuspensionHdl: function(e) {
			// If we end up editing an item and there is an item at the end of the list with ID = 0, that means the user created
			// a suspension and then clicked to edit an existing one. We want to delete the new one.
			if (this.$data.suspensions[this.$data.suspensions.length - 1].id == 0)
				this.$data.suspensions.splice(this.$data.suspensions.length - 1, 1);

			// Now enter usual edit mode
			var targetLi = $(e.currentTarget).closest('[data-suspension-id]');
			this.editModeSuspension(targetLi);
		},

		editModeSuspension: function(targetLi) {
			// If the user clicks to edit a suspension while they are editing a different one, `editMode` will be true
			// and we will assume they wish to discard their changes. No special handling is needed as the Vue template
			// engine will take care care of the DOM for us.
			var suspensionId = targetLi.data('suspension-id'), suspensionIndex = targetLi.index();
			var editMode = suspensionId != this.$data.suspensionEditId; // True if we are ENTERING edit mode

			if (editMode) {
				this.$data.suspensionEditId = suspensionId;

				// This `editModeSuspension` function is called when the edit/save button is clicked, however at this point the
				// DOM has not been updated to reflect the changes in `suspensionEditId`. I.E. the input boxes do not exist, so
				// we can use the `nextTick` function to set the values of the inputs on the next tick, or `Defer the callback
				// to be executed after the next DOM update cycle' - https://vuejs.org/v2/api/#Vue-nextTick
				Vue.nextTick(function() {
					targetLi.find('.input-daterange').datepicker('remove').datepicker(datepickerOptions);

					targetLi.find('[name="suspension-start-date"]').datepicker('setDate', this.$data.suspensions[suspensionIndex].start_date);
					targetLi.find('[name="suspension-end-date"]').datepicker('setDate', this.$data.suspensions[suspensionIndex].end_date);
				}, this /*make 'this' inside nextTick also refer to this Vue instance*/);

			} else { // !editMode

				targetLi.loadingOverlay(true);
				var thisVue = this, pushToServerPromise;

				// 0 is for NEW suspensions (POST)
				if (suspensionId == 0)
					pushToServerPromise = ajax({
						url: "/suspensions",
						method: "POST",
						data: $.param({
							start_date: targetLi.find('[name="suspension-start-date"]').datepicker('getDate').toYYYYMMDD("-"),
							end_date: targetLi.find('[name="suspension-end-date"]').datepicker('getDate').toYYYYMMDD("-")
						})
					}).then(function(d) {
						if (d.success) {
							thisVue.$data.suspensionEditId = -1;
							suspensionId = d.id;
							return ajax({url: "/suspensions/" + suspensionId});
						} else
							throw d.err || "Unknown error occured"; // Pass error onto 'catch'
					});

				// Otherwise update existing (PUT)
				else
					pushToServerPromise = ajax({
						url: "/suspensions/" + suspensionId,
						method: "PUT",
						data: $.param({
							start_date: targetLi.find('[name="suspension-start-date"]').datepicker('getDate').toYYYYMMDD("-"),
							end_date: targetLi.find('[name="suspension-end-date"]').datepicker('getDate').toYYYYMMDD("-")
						})
					}).then(function(d) {
						if (d.success) {
							thisVue.$data.suspensionEditId = -1;
							return ajax({url: "/suspensions/" + suspensionId});
						} else
							throw d.err || "Unknown error occured"; // Pass error onto 'catch'
					});
				
				// Whether we POST or PUT, do this afterwards
				pushToServerPromise.then(function(d) {
					if (d.success) {
						thisVue.$set(thisVue.$data.suspensions, suspensionIndex, convertDateObj(d.result));
						targetLi.loadingOverlay(false);
						reloadMonthlyCurrent();
					} else
						throw d.err || "Unknown error occured"; // Pass error onto 'catch'

				}).catch(function(err) {

					targetLi.loadingOverlay(false);
					alert(typeof err.invalidFields == "string" ? err.invalidFields : err);
					console.error(err);
				})
			}

		},

		deleteSuspension: function(e) {
			var targetLi = $(e.currentTarget).closest('[data-suspension-id]');
			var suspensionId = targetLi.data('suspension-id'), suspensionIndex = targetLi.index();
			var thisVue = this;

			if (confirm("Are you sure you wish to delete this suspension?")) {
				ajax({
					url: "/suspensions/" + suspensionId,
					method: "DELETE"
				}).then(function(d) {
					if (d.success)
						thisVue.$data.suspensions.splice(suspensionIndex, 1);
				});
			}
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

var datepickerOptions = {
	autoclose: true,
	format: "dd/mm/yyyy",
	todayBtn: "linked",
	todayHighlight: true
};

var monthlyOptions = {
	stylePast: true,
	eventList: false,
	dataType: "json",
	jsonUrl: "/calendar/{year}/{month}",

	onStartFetch: function() { $('#main-calendar').loadingOverlay(true); },
	onFinishFetch: function() { $('#main-calendar').loadingOverlay(false); }
};

$(function() {
	$('input[data-date-type]').datepicker(datepickerOptions);
	$('#main-calendar').monthly(monthlyOptions);
});

function reloadMonthlyCurrent() {
	$('#main-calendar').monthly($.extend({reloadEvents: true}, monthlyOptions));
}

// Takes an array of objects with `start_date` and `end_date` properties (in ISO string) and converts them to Date objects
function convertDates(d) {
	for (var i = d.length; i--;)
		convertDateObj(d[i]);
	return d;
}

// Takes an object `start_date` and `end_date` properties (in ISO string) and converts them to Date objects
function convertDateObj(d) {
	d.start_date = new Date(d.start_date);
	if (d.end_date !== null)
		d.end_date = new Date(d.end_date);
	return d;
}

function getSubscriptionFormVal() {
	var model = {};

	model.publication_id = $('[data-subscription-binding="publication_id"]').val();
	model.start_date = $('[data-subscription-binding="start_date"]').datepicker("getDate").toYYYYMMDD("-");
	if (!vm.$data.endDateDisabled)
		model.end_date = $('[data-subscription-binding="end_date"]').datepicker("getDate").toYYYYMMDD("-");
	model.delivery_days = deliveryDaysGet();

	return model;
}

function fullDateStr(d) {
	var dateSuffix = "th";
	switch(d.getDate()) {
		case 1: case 21: case 31: dateSuffix = "st"; break;
		case 2: case 22: dateSuffix = "nd"; break;
		case 3: case 23: dateSuffix = "rd"; break;
	}

	return d.getDate() + "<sup>" + dateSuffix + "</sup> " +
		["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] + " " +
		d.getFullYear();
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

function createAlert(type, title, message) {

}