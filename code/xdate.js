/**
 * @preserve XDate v@VERSION
 * Docs & Licensing: http://arshaw.com/xdate/
 */

Function.prototype.method = function (name, func) {
	this.prototype[name] = func;
	return this;
};

Object.method('superior', function (name) {
	var that = this,
		method = that[name];
	return function ( ) {
		return method.apply(that, arguments);
	};
});

function xDate(spec) {
	var that = {};

	// Auxiliary functions
	function coerceToLocal(date) {
		return new Date(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			date.getUTCHours(),
			date.getUTCMinutes(),
			date.getUTCSeconds(),
			date.getUTCMilliseconds()
		);
	}
	function parseISO(str, utcMode) {
		var m = str.match(/^(\d{4})(-(\d{2})(-(\d{2})([T ](\d{2}):(\d{2})(:(\d{2})(\.(\d+))?)?(Z|(([-+])(\d{2})(:?(\d{2}))?))?)?)?)?$/);
		if (m) {
			var d = new Date(UTC(
				m[1],
				m[3] ? m[3] - 1 : 0,
				m[5] || 1,
				m[7] || 0,
				m[8] || 0,
				m[10] || 0,
				m[12] ? Number('0.' + m[12]) * 1000 : 0
			));
			if (m[13]) { // has gmt offset or Z
				if (m[14]) { // has gmt offset
					d.setUTCMinutes(
						d.getUTCMinutes() +
						(m[15] == '-' ? 1 : -1) * (Number(m[16]) * 60 + (m[18] ? Number(m[18]) : 0))
					);
				}
			}else{ // no specified timezone
				if (!utcMode) {
					d = coerceToLocal(d);
				}
			}
			return d;
		}
	}
	function getDaysInMonth(year, month) {
		return 32 - new Date(UTC(year, month, 32)).getUTCDate();
	}
	var UTC = Date.UTC;
	var FULLYEAR     = 0;
	var MONTH        = 1;
	var DATE         = 2;
	var HOURS        = 3;
	var MINUTES      = 4;
	var SECONDS      = 5;
	var MILLISECONDS = 6;
	var DAY          = 7;
	var YEAR         = 8;
	var WEEK         = 9;
	var DAY_MS = 86400000;
	var methodSubjects = [
		'FullYear',     // 0
		'Month',        // 1
		'Date',         // 2
		'Hours',        // 3
		'Minutes',      // 4
		'Seconds',      // 5
		'Milliseconds', // 6
		'Day',          // 7
		'Year'          // 8
	];
	var subjectPlurals = [
		'Years',        // 0
		'Months',       // 1
		'Days'          // 2
	];
	var unitsWithin = [
		12,   // months in year
		31,   // days in month (sort of)
		24,   // hours in day
		60,   // minutes in hour
		60,   // seconds in minute
		1000, // milliseconds in second
		1     //
	];

	// Adders
	function add(xdate, fieldIndex, delta, preventOverflow) {
		delta = Number(delta);
		var intDelta = Math.floor(delta);
		xdate['set' + methodSubjects[fieldIndex]](
			xdate['get' + methodSubjects[fieldIndex]]() + intDelta,
			preventOverflow || false
		);
		if (intDelta != delta && fieldIndex < MILLISECONDS) {
			add(xdate, fieldIndex+1, (delta-intDelta)*unitsWithin[fieldIndex], preventOverflow);
		}
	}

	// Differs
	var diff = function(xdate1, xdate2, fieldIndex) { // fieldIndex=FULLYEAR is for years, fieldIndex=DATE is for days
		var old_utc_1 = xdate1.getUTCMode(), old_utc_2 = xdate2.getUTCMode();
		xdate1.setUTCMode(true, true);
		xdate2.setUTCMode(true, true);
		var v = 0;
		if (fieldIndex == FULLYEAR || fieldIndex == MONTH) {
			for (var i=MILLISECONDS, methodName; i>=fieldIndex; i--) {
				v /= unitsWithin[i];
				v += xdate2['get' + methodSubjects[i]]() - xdate1['get' + methodSubjects[i]]();
			}
			if (fieldIndex == MONTH) {
				v += (xdate2.getFullYear() - xdate1.getFullYear()) * 12;
			}
		}
		else if (fieldIndex == DATE) {
			var clear1 = xdate1.toDate().setUTCHours(0, 0, 0, 0); // returns an ms value
			var clear2 = xdate2.toDate().setUTCHours(0, 0, 0, 0); // returns an ms value
			v = Math.round((clear2 - clear1) / DAY_MS) + ((xdate2 - clear2) - (xdate1 - clear1)) / DAY_MS;
		}
		else {
			v = (xdate2 - xdate1) / [
					3600000, // milliseconds in hour
					60000,   // milliseconds in minute
					1000,    // milliseconds in second
					1        //
				][fieldIndex - 3];
		}
		xdate1.setUTCMode(old_utc_1);
		xdate2.setUTCMode(old_utc_2);
		return v;
	};

	// Actual implementation
	if (spec.date)
	{
		that = new Date(spec.date);
	}
	else if (spec.year) {
		var fields = ['month', 'day', 'hours', 'minutes', 'seconds', 'milliseconds'];
		var args = [spec.year];
		for (var i in fields)
		{
			if (typeof(spec[fields[i]]) === 'undefined')
			{
				break;
			}
			args.push(spec[fields[i]]);
		}
		that = new Date(UTC.apply(Date, args));
		if (!utcMode) {
			that = coerceToLocal(that);
		}
	}
	else if (spec.datestring) {
		that = parseISO(spec.datestring, utcMode);
	}

	var utcMode = spec.utcMode === true;
	that.getUTCMode = function()
	{
		return utcMode;
	};
	that.setUTCMode = function(val)
	{
		utcMode = val === true;
		return that;
	};

	// Each setter returns "that" to allow for chaining. Do not define setFullYear and setMonth yet.
	for (var i = 2; i < methodSubjects.length; i++)
	{
		var field = methodSubjects[i];
		var setter_name = 'set' + field;
		var sup = that.superior(setter_name);
		that[setter_name] = function(value)
		{
			sup(value);
			return that;
		}
	}

	// setFullYear and setMonth accept an optional preventOverflow parameter
	var setFullYear = that.superior('setFullYear');
	that.setFullYear = function(fullYear, preventOverflow)
	{
		var preventOverflow = preventOverflow === true;
		var expectedMonth = that.getMonth();
		setFullYear(fullYear);
		if (preventOverflow && that.getMonth() != expectedMonth) {
			that.setMonth(expectedMonth);
			that.setDate(getDaysInMonth(fullYear, expectedMonth));
		}
		return that;
	};

	var setMonth = that.superior('setMonth');
	that.setMonth = function(month, preventOverflow)
	{
		var preventOverflow = preventOverflow === true;
		setMonth(month);
		if (preventOverflow && that.getMonth() != month) {
			that.setDate(getDaysInMonth(that.getYear(), month));
			that.setMonth(month);
		}
		return that;
	};

	for (var i = 0; i < methodSubjects.length; i++)
	{
		if (i <= MILLISECONDS)
		{
			(function(i)
			{
				var singular = methodSubjects[i];
				var plural   = subjectPlurals[i] || singular;
				that['add' + plural] = function(delta, preventOverflow) {
					add(this, i, delta, preventOverflow);
					return this;
				};
				that['diff' + plural] = function(otherDate)
				{
					return diff(this, otherDate, i);
				};
			})(i);
		}
	}

	that.addWeeks = function(delta) {
		return that.addDays(Number(delta) * 7);
	};

	return that;
}