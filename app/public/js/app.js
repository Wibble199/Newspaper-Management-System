function createSubscriptionListItem() {
	var newItem = $($('#subscription-list-item').html());
	$('#subscription-list').append(newItem);
}

function createSuspensionListItem() {
	var newItem = $($('#suspension-list-item').html());
	$('#suspension-list').append(newItem);
}

for (var i = 4; i--;) createSubscriptionListItem();
for (var i = 3; i--;) createSuspensionListItem();