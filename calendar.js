function todayDate() {
    var days = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
}
function nextItemId() {
    'use strict';
	localStorage.nextId = localStorage.nextId ? parseInt(localStorage.nextId, 10) + 1 : 0;
	return 'item' + localStorage.nextId;
}

// callback expects a list of objects with the itemId and itemValue properties set
function lookupItemsForParentId(parentId, callback) {
    'use strict';
	if (localStorage[parentId]) {
		var parentIdsToItemIds = localStorage[parentId].split(',');
		var list = [];

		for (var i in parentIdsToItemIds)
		{
			var itemId = parentIdsToItemIds[i];
			var itemValue = localStorage[itemId];
			list.push({'itemId': itemId, 'itemValue': itemValue});
		}

		callback(list);
	}
}

function storeValueForItemId(itemId)
{
	var item = document.getElementById(itemId);
	if(item)
	{
		var parentId = item.parentNode.id;
		localStorage[itemId] = item.value;

		var parentIdsToItemIds = localStorage[parentId] ? localStorage[parentId].split(',') : [];
		var found = false;
		for(var i in parentIdsToItemIds)
		{
			if(parentIdsToItemIds[i] == itemId)
			{
				found = true;
				break;
			}
		}
		if(!found)
		{
			parentIdsToItemIds.push(itemId);
			localStorage[parentId] = parentIdsToItemIds;
		}
	}
}

function removeValueForItemId(itemId)
{
	delete localStorage[itemId];

	var item = document.getElementById(itemId);
	if(!item) return;
	var parentId = item.parentNode.id;
	if(localStorage[parentId])
	{
		var parentIdsToItemIds = localStorage[parentId].split(',');
		for(var i in parentIdsToItemIds)
		{
			if(parentIdsToItemIds[i] == itemId)
			{
				parentIdsToItemIds = parentIdsToItemIds.slice(0, i).concat(parentIdsToItemIds.slice(i + 1));
				if(parentIdsToItemIds.length) localStorage[parentId] = parentIdsToItemIds;
				else delete localStorage[parentId];
				break;
			}
		}
	}
}

var todayDate;
var firstDate;
var lastDate;
var calendarTableElement;
var itemPaddingBottom = (navigator.userAgent.indexOf('Firefox') != -1) ? 2 : 0;
var months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

function idForDate(date)
{
	return date.getMonth() + '_' + date.getDate() + '_' + date.getFullYear();
}

function recalculateHeight(itemId)
{
	var item = document.getElementById(itemId);
	if(!item) return; // TODO: why is this sometimes null?
	item.style.height = '0px'; // item.scrollHeight doesn't shrink on its own
	item.style.height = item.scrollHeight + itemPaddingBottom + 'px';
}

function keydownHandler()
{
	recalculateHeight(this.id);
	if(this.storeTimeout) clearTimeout(this.storeTimeout);
	this.storeTimeout = setTimeout('storeValueForItemId("' + this.id + '")', 100);
}

function checkItem()
{
	if(this.value.length == 0)
	{
		removeValueForItemId(this.id);
		this.parentNode.removeChild(this);
	}
}

function generateItem(parentId, itemId)
{
	var item = document.createElement('textarea');
	var parent = document.getElementById(parentId);
	if(!parent) return; // offscreen items aren't generated
	parent.appendChild(item);
	item.id = itemId;
	item.onkeyup = keydownHandler;
	item.onblur = checkItem;
	item.spellcheck = false;
	return item;
}

document.onclick = function(e)
{
	var parentId = e.target.id;
	if(parentId.indexOf('_') == -1) return;

	var item = generateItem(parentId, nextItemId());
	recalculateHeight(item.id);
	storeValueForItemId(item.id);
	item.focus();
}

function generateDay(day, date)
{
	var isShaded = (date.getMonth() % 2);
	var isToday = (date.getDate() == todayDate.getDate() && date.getMonth() == todayDate.getMonth() && date.getFullYear() == todayDate.getFullYear());

	if(isShaded) day.className += ' shaded';
	if(isToday) day.className += ' today';

	day.id = idForDate(date);
	day.innerHTML = '<span>' + date.getDate() + '</span>';

	lookupItemsForParentId(day.id, function(items)
	{
		for(var i in items)
		{
			var item = generateItem(day.id, items[i].itemId);
			item.value = items[i].itemValue;
			recalculateHeight(item.id);
		}
	});
}

function prependWeek() {
	var week = calendarTableElement.insertRow(0);
	var monthName = '';

	// move firstDate to the beginning of the previous week assuming it is already at the beginning of a week
	do
	{
		firstDate.setDate(firstDate.getDate() - 1);
		if(firstDate.getDate() == 1) monthName = months[firstDate.getMonth()] + '<br />' + firstDate.getFullYear();

		var day = week.insertCell(0);
		generateDay(day, firstDate);
	} while(firstDate.getDay() != 0);

	var extra = week.insertCell(0);
	extra.className = 'extra';
	extra.innerHTML = monthName;
}

function appendWeek() {
	var week = calendarTableElement.insertRow(-1);
	var monthName = '';

	// move lastDate to the end of the next week assuming it is already at the end of a week
	do
	{
		lastDate.setDate(lastDate.getDate() + 1);
		if(lastDate.getDate() == 1) monthName = months[lastDate.getMonth()] + '<br />' + lastDate.getFullYear();

		var day = week.insertCell(-1);
		generateDay(day, lastDate);
	} while(lastDate.getDay() != 6)

	var extra = week.insertCell(0);
	extra.className = 'extra';
	extra.innerHTML = monthName;
}
function scrollPositionForElement(element)
{
	// find the y position by working up the DOM tree
	var clientHeight = element.clientHeight;
	var y = element.offsetTop;
	while(element.offsetParent && element.offsetParent != document.body)
	{
		element = element.offsetParent;
		y += element.offsetTop;
	}

	// center the element in the window
	return y - (window.innerHeight - clientHeight) / 2;
}

function scrollToToday()
{
	window.scrollTo(0, scrollPositionForElement(document.getElementById(idForDate(todayDate))));
}

var startTime;
var startY;
var goalY;

function curve(x)
{
	return (x < 0.5) ? (4*x*x*x) : (1 - 4*(1-x)*(1-x)*(1-x));
}

function scrollAnimation()
{
	var percent = (new Date() - startTime) / 1000;

	if(percent > 1) window.scrollTo(0, goalY);
	else
	{
		window.scrollTo(0, Math.round(startY + (goalY - startY) * curve(percent)));
		setTimeout('scrollAnimation()', 10);
	}
}

function documentScrollTop()
{
	var scrollTop = document.body.scrollTop;
	if(document.documentElement) scrollTop = Math.max(scrollTop, document.documentElement.scrollTop);
	return scrollTop;
}

function documentScrollHeight()
{
	var scrollHeight = document.body.scrollHeight;
	if(document.documentElement) scrollHeight = Math.max(scrollHeight, document.documentElement.scrollHeight);
	return scrollHeight;
}

function smoothScrollToToday()
{
	goalY = scrollPositionForElement(document.getElementById(idForDate(todayDate)));
	startY = documentScrollTop();
	startTime = new Date();
	if(goalY != startY) setTimeout('scrollAnimation()', 10);
}

function poll()
{
	// add more weeks so you can always keep scrolling
	if(documentScrollTop() < 200)
	{
		var oldScrollHeight = documentScrollHeight();
		for(var i = 0; i < 8; i++) prependWeek();
		window.scrollBy(0, documentScrollHeight() - oldScrollHeight);
	}
	else if(documentScrollTop() > documentScrollHeight() - window.innerHeight - 200)
	{
		for(var i = 0; i < 8; i++) appendWeek();
	}

	// update today when the date changes
	var newTodayDate = new Date;
	if(newTodayDate.getDate() != todayDate.getDate() || newTodayDate.getMonth() != todayDate.getMonth() || newTodayDate.getFullYear() != todayDate.getFullYear())
	{
		// TODO: resize all items in yesterday and today because of the border change

		var todayElement = document.getElementById(idForDate(todayDate));
		if(todayElement) todayElement.className = todayElement.className.replace('today', '');

		todayDate = newTodayDate;

		todayElement = document.getElementById(idForDate(todayDate));
		if(todayElement) todayElement.className += ' today';
	}
}

function loadCalendarAroundDate(seedDate)
{
	calendarTableElement.innerHTML = '';
	firstDate = new Date(seedDate);

	// move firstDate to the beginning of the week
	while(firstDate.getDay() != 0) firstDate.setDate(firstDate.getDate() - 1);

	// set lastDate to the day before firstDate
	lastDate = new Date(firstDate);
	lastDate.setDate(firstDate.getDate() - 1);

	// generate the current week (which is like appending to the current zero-length week)
	appendWeek();

	// fill up the entire window with weeks
	while(documentScrollHeight() <= window.innerHeight)
	{
		prependWeek();
		appendWeek();
	}

	// need to let safari recalculate heights before we start scrolling
	setTimeout('scrollToToday()', 50);
}

window.onload = function()
{
	calendarTableElement = document.getElementById('calendar');
	todayDate = new Date;

	loadCalendarAroundDate(todayDate);
	setInterval('poll()', 100);
}
function logOut(){ 
    document.getElementById("mybutton").onclick = function(){
    location.href = "calendar.html";
    }
}
function showHelp() { 
    document.getElementById('help').style.display = 'block';
}
function hideHelp() { 
    document.getElementById('help').style.display = 'none';
}

document.write('<div id = "h1">CSULB Student Calendar<div id = "days"><b class="mybutton"href="javascript:logOut()">logout</b> \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 Sunday \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 | \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 Monday \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 | \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0Tuesday \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 | \u00A0\u00A0\u00A0\u00A0 Wednesday \u00A0\u00A0\u00A0\u00A0\u00A0 | \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 Thursday \u00A0 \u00A0\u00A0\u00A0\u00A0 | \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 Friday \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 | \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 Saturday<div id="header"><a class="button" href="javascript:smoothScrollToToday()">Current Date</a><a class="button" href="javascript:showHelp()">Help</a>&nbsp;</a></div></div></div>');
document.write('<table id="calendar"></table>');
document.write('<div id="help"><div><ul><li>Click on a date to add an event</li><li>Click on a date to delete an event</li><li>Use the scroll wheel/trackpad to navigate</li></ul><a class="button" href="javascript:hideHelp()">Close</a></div></div>');