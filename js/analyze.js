if (window.File && window.FileReader && window.FileList && window.Blob) {
	console.log("This browser confirm window.File && window.FileReader !!!");
} else {
	alert('The File APIs are not fully supported in this browser.');
}

options = {
	url: {
		tokenUrl: 'https://token.beyondverbal.com/token',
		serverUrl: 'https://alphav3.beyondverbal.com/v1/recording/'
	},

	apiKey: $("#api_key").val(),
	token: '',
	interval: 0,
};

$(function () {
	$("#form").validate({
		submitHandler: function (form) {
			$("#submit").attr("disabled", true).text("Analyze...");
			$('#progress').html('');
			$('#finish').html('');
			options.interval = 0;

			authenticate()
				.error(function (jqXHR, textStatus, errorThrown) {
					Show(JSON.stringify(jqXHR) + textStatus + JSON.stringify(errorThrown));
				})
				.success(function (data) {
					var token = JSON.parse(data);
					options.token = token.access_token;
					uploadFile(form[0].files[0]);
				});
		}
	});

});

function uploadFile(file) {
	if (typeof FileReader !== "undefined") {
		var reader = new FileReader();
		reader.onload = function (e) {
			analyzeFile($("#api_key").val(), e.target.result, 7000)
				.done(function (res) {
					$("#submit").attr("disabled", false).text("Start");
				})
				.fail(function (err) {
					Show(err);
					$("#submit").attr("disabled", false).text("Error");
				})
				.progress(function (p) {
					Show(p);
					//console.info("progress:::"+JSON.stringify(p));
					//options.interval = p.result.duration;
				});
		};
		reader.readAsArrayBuffer(file);
	}
}

function authenticate() {
	console.log('url token:' + options.url.tokenUrl);
	options.apiKey = $("#api_key").val();
	return $.ajax({
		url: options.url.tokenUrl,
		type: "POST",
		dataType: 'text',
		contentType: 'application/x-www-form-urlencoded',
		data: {
			grant_type: "client_credentials",
			apiKey: options.apiKey
		}
	});

}

function analyzeFile(apiKey, content, interval) {
	var dfd = $.Deferred();
	var pTimer = null;
	var startUrl = options.url.serverUrl + "start";

	console.log('url::' + startUrl + ' token:' + options.token);

	$.ajax({
			url: startUrl,
			headers: {
				'Authorization': "Bearer " + options.token
			},
			type: "POST",
			//cache: false,
			data: JSON.stringify({
				dataFormat: {
					type: "WAV"
				}
			}),
			contentType: 'application/x-www-form-urlencoded',
			dataType: 'text'
		})
		.then(function (data) {
			Show(data);

			var recID = data.recordingId ? data.recordingId : JSON.parse(data).recordingId;
			console.log('recid::' + recID);
			var upStreamUrl = options.url.serverUrl + recID;
			//post content for analysis
			$.ajax({
					url: upStreamUrl,
					headers: {
						'Authorization': "Bearer " + options.token
					},
					data: content,
					contentType: false,
					processData: false,
					cache: false,
					dataType: 'text',
					type: "POST"
				})
				.fail(dfd.reject).done(function (data) {
					ShowFinish(data);
				});

			//periodically ask for intermediate results
			pTimer = setInterval(function () {
				var analysisUrl = options.url.serverUrl + recID + '/analysis?fromMs=' + options.interval;

				$.ajax({
						url: analysisUrl,
						headers: {
							'Authorization': "Bearer " + options.token
						},
						cache: false,
						type: "GET"
					})
					.done(function (ares) {
						dfd.notify(ares);

						console.info("done:" + JSON.stringify(ares));
						try {
							console.info("offset:" + ares.result.analysisSegments[0].offset);

							if (ares.result.analysisSegments[0].offset)
								options.interval = ares.result.analysisSegments[0].offset;
						} catch (err) {}



						if (ares.result.sessionStatus == "Done") {

							if (pTimer)
								clearInterval(pTimer);
							dfd.resolve();
						}
					})
					.fail(dfd.reject);

			}, interval);

		}, dfd.reject);

	return dfd.promise().always(function () {});
}

function Show(json) {
	$('#progress').append("<li>" + JSON.stringify(json) + "</li>");
}

function ShowFinish(json) {
	$('#finish').append("<li>" + JSON.stringify(json) + "</li>");
}