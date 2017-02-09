if (window.File && window.FileReader && window.FileList && window.Blob) {
	console.log("This browser confirm window.File && window.FileReader !!!");
} else {
	alert('The File APIs are not fully supported in this browser.');
}

options = {
	url: {
		tokenUrl: 'https://token.beyondverbal.com/token',
		serverUrl: 'https://apiv3.beyondverbal.com/v1/recording/'

	},
	apiKey: '$("#api_key").val()',
	token: ''

};

$(function () {
	$("#form").validate({
		submitHandler: function (form) {
			$("#submit").attr("disabled", true).text("Analyze...");
			$('#result').html('');

			authenticate()
				.error(function (jqXHR, textStatus, errorThrown) {
					Show(JSON.stringify(jqXHR) + errorThrown);
				})
				.success(function (data) {
					console.log('sucess::' + JSON.stringify(data));
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
			analyzeFile($("#api_key").val(), e.target.result)
				.done(function (res) {
					Show(res);
					$("#submit").attr("disabled", false).text("Start");
				})
				.fail(function (err) {
					Show(err);
					$("#submit").attr("disabled", false).text("Start");
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
	var startUrl = options.url.serverUrl + 'start';

	//console.log('url::' + startUrl + ' token:' + options.token);

	$.ajax({
			url: startUrl,
			headers: {
				'Authorization': "Bearer " + options.token
			},
			type: "POST",
			cache: false,
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
			//console.log('recid::' + recID);
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
				.then(dfd.resolve, dfd.reject);

		}, dfd.reject);

	return dfd.promise().always(function () {});
}

function Show(json) {
	
	var obj = jQuery.parseJSON( json );
	//obj.result.analysisSegments[0]
	if (obj.result) {
		console.log(obj.result.analysisSegments[0].analysis.Mood.Composite.Primary.Phrase);
		$('#result').append("<li>" + obj.result.analysisSegments[0].analysis.Mood.Composite.Primary.Phrase + "</li>");
	} else {
		console.log(obj);
		$('#result').append("<li>" + JSON.stringify(json) + "</li>");
	}
}