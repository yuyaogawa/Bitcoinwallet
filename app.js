    /*******************************************************/
    // This is the code for DexWallet.
    //
    // 1) generateAddress()
    //    Controls several ways to generate an address.
    //    Look at the documentation for login process flow chart.
    //
    // 2) checkPassword()
    //    Check the password when the url has ! mark.
    //
    // 3) createAddress()
    //    Create BitcoinAddress with Mnemonics(BIP39).
    //    There are 4 ways to create an address.
    //     (2) with Mnemonic(*1) + password
    //     (3) with Mnemonic(*1)
    //     (5) with new Mnemonic + password
    //     (6) with new Mnemonic
    //    *1 It is 12 words retrieved from URL after # tag.
    //
    // 4) getTxHistory(address)
    //    Get the TxHistory with Blockexplorer API.
    //     * https://blockexplorer.com/api/txs/
    //
    // 5) getBalance(address)
    //    Get the Balance with Bitcore API(insight).
    //
    // 6) calcFee()
    //    Calculate mining fees before broadcasting.
    //
    // 7) sendBitcoin()
    //    Sned BTC from your own Address to Receiveing Address with Bitcore API(insight).
    //
    // 8) scanQRcode()
    //    Scan QRcode with the below library. This function is run only on HTTPS.
    //    https://github.com/dwa012/html5-qrcode.git
    //
    // 9) stopCamera()
    //    Stop Scanner.
    //
    // 10) getCurrency(balances)
    //    Get currency with API.
    //     * https://blockchain.info/ticker
    //
    // 11) generateQRcode()
    //    GenerateQRcode by using GoogleAPI
    //
    // 12) getBitcoinFee()
    //    Get recommended fees by using bitcoinfees21 API
    //
    // 13) setCookie()
    //    Well, we might consider using localStorage instead of Cookies. localStorage is more secure and space to store data.
    //    Currently, I am using setCookie function...
    //    https://stackoverflow.com/questions/3220660/local-storage-vs-cookies
    //
    // 14) readCookie()
    //
    // 15) validateInputs()
    //    Validate 2 things as following
    //     (1) Addresss       : If it is valid address for Bitcoin in Mainnet
    //     (2) Amount of BTC  : If the wallet has enough money that you want to send
    //
    // Other functions
    // dispLoading,removeLoading,showMessage,openTab,formatMoney,btcFormat
    //
    /*******************************************************/

    const ERROR = "ERROR";
    const SUCCESS = "SUCCESS";
    const WRONGPASSWORD = "WRONGPASSWORD";
    const url_currency = 'https://blockchain.info/ticker';
    const url_fee = 'https://bitcoinfees.21.co/api/v1/fees/recommended';
    const url_tx ='https://blockexplorer.com/api/txs/?address=';
    const url_qr = "https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=http://dexcoin.ca/wallet/index.html%23";
    const url_receiving = "https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=bitcoin%3A";
    const url_dex = "https://dexcoin.ca/api/DXW_API.php";
    const MSG_BALANCE = "Sorry, we can't show your bitcoin balance at this moment because the third party didn't reply. Try to refresh your browser.";
    const MSG_HISTORY = "Sorry, we can't show your transaction history at this moment because the third party didn't reply. Try to refresh your browser.";
    const MSG_FEE = "Sorry, we can't show recommended mining fees at this moment because the third party didn't reply. Try to refresh your browser.";
    const MSG_CURRENCY = "Sorry, we can't show currency at this moment because the third party didn't reply. Try to refresh your browser.";
    const MSG_INVALIDADDR = "Receiving address is invalid.";
    var bitcore = require('bitcore-lib');
    var networks = bitcore.Networks.mainnet;// You can switch mainnet or testnet. Pick up either "mainnet" or "testnet".
    var keyNetwork;
    if(networks === bitcore.Networks.testnet){
        keyNetwork = 'testnet';
    }else{
        keyNetwork = 'mainnet';
    }    
    var Mnemonic = require('bitcore-mnemonic');
    var explorers = require('bitcore-explorers');
    var insight = new explorers.Insight(networks);
    var wif;
    var address;
    var useFiat = false;
    var currency;
    var fiatvalue;
    var objCurrency;
    var sym;
    var balance = 0;
    var estsize;
    var message;
    var password = "";
    var hash;
    var newurl;
    var code;
    var Mseed;
    var noPassword = false;
    var fee = 100;// We use a API to get mining fees. 100 satoshis per byte is the fee just in case that the API won't return the fess.
    var lat = 0;
    var lng = 0;
    var alt = 0;
    var jsonString = '{"Documentation":{"REQ":"INITIALIZE","REP":" ","LOG":"Login"}}' ;
    var jsonArray = JSON.parse ( jsonString );
    jsonArray.Documentation.REQ='INITIALIZE';

    // We use cookie to just store your currency. USD is the default currency.
    if (readCookie("currency") != ""){
        this.currency = readCookie("currency");
    }else{
        this.currency = 'USD';
    }
    // Set up Global functions
    dex = window.dex = {
        "useFiat": false,
        "useFiat2": false,
        "setCurrency": function (currency){
            setCookie("currency", currency, 100);
        },
        "getFiatPrefix": function(){
            switch ( currency )
            {
                case "AUD":
                case "USD":
                case "CAD":
                case "CLP":
                case "HKD":
                case "NZD":
                case "SGD":
                    return "$";
                    break;
                case "BRL":
                    return "R$"; 
                case "CHF":
                    return "CHF";
                case "CNY":
                    return "¥";
                case "DKK":
                    return "kr";
                case "EUR":
                    return "€";
                case "GBP":
                    return "£";
                case "INR":
                    return "";
                case "ISK":
                    return "kr";
                case "JPY":
                    return "¥";
                case "KRW":
                    return "₩";
                case "PLN":
                    return "zł";
                case "RUB":
                    return "RUB";
                case "SEK":
                    return "kr";
                case "THB":
                    return "T฿";
                case "TWD":
                    return "NT$";
                default:
                    return "$";
            }
        },
        "amountFiatValue": function (){
            var amount = $("#txtAmount").val();
            amount = parseFloat(amount);

            if (!amount){
                amount = 0;
            }
            if ( dex.useFiat ){
                var btcValue = amount / fiatvalue;
                $("#fiatPrice").html("(฿" + btcFormat( btcValue ) + ")");
            } else {
                var fiatValue = fiatvalue * amount;
                fiatValue = fiatValue.toFixed(2);
                $("#fiatPrice").html("(" + this.getFiatPrefix() + formatMoney(fiatValue) + currency + ")");
            }
        },
        "amountFiatValue2": function (){
            var amount = $("#Recamount").val();
            amount = parseFloat(amount);

            if (!amount){
                amount = 0;
            }
            if ( dex.useFiat2 ){
                var btcValue = amount / fiatvalue;
                $("#fiatPrice2").html("(฿" + btcFormat( btcValue ) + ")");
            } else {
                var fiatValue = fiatvalue * amount;
                fiatValue = fiatValue.toFixed(2);
                $("#fiatPrice2").html("(" + this.getFiatPrefix() + formatMoney(fiatValue) + currency + ")");
            }
        }
    };
    // Set up EventListener
    $(document).on("click", '#choiceCurrency', function (event){
        $("#settingsCurrency").show();
        $("#settingsChoices").hide();
        //$("#settingsTitleText").html( "Set Currency" );
    });
    $(document).on("click", '#settings', function (event){
        //$("#defaultFeePlaceholder").text(0);
        $("#settingsChoices").show();
        $("#settingsModal").modal("show");
        $("#settingsCurrency, #settingsBackup").hide();
        //$("#settingsTitleText").html( "Settings" );
        //$("#settingModal").modal("show");
    }); 
    $(document).on("change", '#currencySelect', function (event){
        currency = $(this).val();
        if ( dex.useFiat ){
            $(".addonBox").html( dex.getFiatPrefix() );
        }
        dex.setCurrency(currency);
        fiatvalue = objCurrency[currency].last;
        sym = objCurrency[currency].symbol;
        $('#currency').text(' ≈ ' + sym + (balance*fiatvalue).toFixed(2) + currency);
    }); 
    $(document).on("change", '#feeSelect', function (event){
        var feeSelect = parseInt($(this).val());
        fee = parseFloat(feeSelect);
        $("#txtFeeAmount").val(fee);
    });
    $(document).on("click", '#choiceBackup', function (event){
        var url = window.location.hash.substring(1);
        var arr = url.split('!');
        // If a user sets up password, go to the first api.
        // If not, go to the second api.
        if(arr.length > 1){
            $("#qrUrl4Bk").attr("src", url_qr + arr[0] + "%21" + arr[1] + "&chld=H|0");
        }else{
            $("#qrUrl4Bk").attr("src", url_qr + arr[0] + "&chld=H|0");
        }
        
        $("#settingsBackup").show();
        $("#settingsChoices").hide();

        $("#txtMnemonic4Bk").val( code );
        $("#txtPassword4Bk").val( password );
    });
    $(document).on("keyup", '#txtFeeAmount', function (event){
        if ($(this).val().length > 0 && $(this).val() > 0 && !isNaN( $(this).val() ) ){
            amount = $(this).val();
            fee = parseFloat(amount);
        }
    });
    $(document).on("click", '#changeType', function (e){
        if ( $("#changeType .addonBox").html() == "฿" )
        {
            $("#changeType .addonBox").html( dex.getFiatPrefix() );
            dex.useFiat = true;
            dex.amountFiatValue();
            //if ( !mobilecheck() )
                $("#txtAmount").focus();
        } else {
            $("#changeType .addonBox").html("฿");
            dex.useFiat = false;
            dex.amountFiatValue();
            //if ( !mobilecheck() )
                $("#txtAmount").focus();
        }
    });
    $(document).on("click", '#changeType2', function (e){
        if ( $("#changeType2 .addonBox").html() == "฿" )
        {
            $("#changeType2 .addonBox").html( dex.getFiatPrefix() );
            dex.useFiat2 = true;
            dex.amountFiatValue2();
            //if ( !mobilecheck() )
                $("#Recamount").focus();
        } else {
            $("#changeType2 .addonBox").html("฿");
            dex.useFiat2 = false;
            dex.amountFiatValue2();
            //if ( !mobilecheck() )
                $("#Recamount").focus();
        }
    });
    $(document).on("keyup", '#txtAmount', function (event){

        amount = $(this).val();
        if ( dex.useFiat ){
            amount = parseFloat(amount) / fiatvalue;
            amount = btcFormat(amount);
        }
        if ( $(this).val().length > 0 ){
            dex.amountFiatValue();
        }else{
            $("#fiatPrice").html("");
            $(this).css({"font-size":"14px"});
        }
        /**
        if ( $(this).val().length > 0 && parseFloat(amount) <= balance && parseFloat(amount) * 100000000 > bitcore.Transaction.DUST_AMOUNT){
            $("#sendBtn").removeAttr("disabled");
        } else {
            $("#sendBtn").attr("disabled", "disabled").html("Send");
        }
        **/
        if(validateInputs()){
            $("#sendBtn").removeAttr("disabled");
        }else{
            $("#sendBtn").attr("disabled", "disabled").html("CONFIRM");
        }
    });
    $(document).on("keyup", '#sendAddr', function (event){
        if(validateInputs()){
            $("#sendBtn").removeAttr("disabled");
        }else{
            $("#sendBtn").attr("disabled", "disabled").html("CONFIRM");
        }
    });
    $(document).on("keyup", '#Recamount', function (event){
        amount = $(this).val();

        if ( dex.useFiat2 )
        {
            amount = parseFloat( amount ) / fiatvalue;
            amount = btcFormat( amount );
        }
        if ( $(this).val().length > 0 )
        {
            dex.amountFiatValue2();
        }
        else
        {
            $("#fiatPrice2").html("");
            $(this).css({"font-size":"14px"});
        }
    });
    $(document).on("click", '#openSend', function (event){
        $("#receive").collapse('hide');
    }); 
    $(document).on("click", '#openReceive', function (event){
        $("#send").collapse('hide');
    }); 
    $(document).on("click", '#sendBtn', function (event){
        $("#fee").text(fee);
        calcFee();
    });
    $(document).on("click", '#setupPassword', function (event){
        $("#passwordBox").show();
    });
    $(document).on("click", '#btnPrint', function (event){
        var elem = document.getElementById("settingsBackup");
        var domClone = elem.cloneNode(true);
        var $printSection = document.getElementById("printSection");
        if (!$printSection) {
            var $printSection = document.createElement("div");
            $printSection.id = "printSection";
            document.body.appendChild($printSection);
        }
        $printSection.innerHTML = "";
        $printSection.appendChild(domClone);
        window.print();
    });
    $(document).on("click", "[data-hide]", function(event){
        $(this).closest("." + $(this).attr("data-hide")).hide();
    });


    getLocation();

    // Login process starts from here.
    // Look at the documentation for login process.
    // window.location is a function to get strings of URL
    // Code for "If # exists"
    hash = window.location.hash.substring(1);
    if(hash.length > 0){
        // Code for "If ! exists"
        if (hash.indexOf("!") > 0){
            // (1) Show password view
            $(document).ready(function(){
                $("#enterPassword").modal("show");
            });
        }else{
            // (3) Generate an address with Mnemonic( which retrieved from URL after #tag).
            noPassword = true;
            generateAddress();
        }
    }else{
        // Ask a user if they want to set up password
        // If they say Yes, (4) Show setup password view and after setting up it (5) Generate an address with new Mnemonic + password.
        // If they say No,  (6) Generate and address with new Mnemonic + password.
        $(document).ready(function(){
            $("#passwordModal").modal("show");
            $("#passwordModal").draggable({
              handle: ".modal-header"
            });
        });
    }


/********************** Functions*********************************/

    function validateInputs(){
            var amount = $("#txtAmount").val();
            var send_address = $("#sendAddr").val();
            var error;
            if(send_address.length > 0){
                error = bitcore.Address.getValidationError(send_address, networks);
            }else{
                error = "Receiving address is empty";
            }
            if(error){
                return false;
            }else{
                if ( dex.useFiat ){
                    amount = parseFloat(amount) / fiatvalue;
                    amount = btcFormat(amount);
                }
                if ( amount.length > 0 ){
                    dex.amountFiatValue();
                }else{
                    $("#fiatPrice").html("");
                    $(this).css({"font-size":"14px"});
                }
                if ( amount.length > 0 && parseFloat(amount) <= balance && parseFloat(amount) * 100000000 > bitcore.Transaction.DUST_AMOUNT){
                    return true;
                } else {
                    return false;
                }
            }
    }
    // This function controls several ways to generate an address.
    // Use "Promise" to call createAddress() so that left of functions will be pending until an address is created.
    // This is a good example to use "Promise" and "Then" function.
    // Do not wirte code looks like below because there is no promise that getBalance will be excuted after creating an address.
    // Bad example is here
    //    createAddress();
    //    getBalance(address);
    //    getTxHistory(address); 
    function generateAddress(){

        if(noPassword){
            // (3) Generate an address with Mnemonic
            $.when(createAddress()).then(
                getBalance(address),
                getTxHistory(address),
                getBitcoinFee()
            );
            js_GetServerInfo("LOGIN");

        }else if($("#txtPassword").val().length > 0){
            // (5) Generate an address with new Mnemonic + password.
            password = $("#txtPassword").val();
            $.when(createAddress()).then(
                getBalance(address),
                getTxHistory(address),
                getBitcoinFee()
            );
            js_GetServerInfo("CREATE");

        }else{
            if(hash.length > 0){
                js_GetServerInfo("LOGIN")
            }else{
                js_GetServerInfo("CREATE")
            }
            // Code for either (2) or (6)
            $.when(createAddress()).then(
                getBalance(address),
                getTxHistory(address),
                getBitcoinFee()
            );
            
        }
    }
    // Check the password and if it is correct, (2) Generate an address with Mnemonic + password.
    function checkPassword(){
        var hashArr = hash.split("!");
        password = $("#chkPassword").val();
        var userPassHash = bitcore.crypto.Hash.sha256(new buffer.Buffer(password) );
        var passChk = userPassHash.toString('hex').substring(0, 10);
        if (passChk == hashArr[1]){
            hash = hashArr[0];
            generateAddress();
            $("#enterPassword").modal("hide");
        }else{
            showMessage(WRONGPASSWORD,"Incorrect! <br> Do not mistake more than 3 times Otherwise your wallet will be gone ;)");
        }
    }
    // Create Bitcoin Address
    // BIP39 Mnemonics https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
    // Usage of bitcoin-menominc https://github.com/bitpay/bitcore-mnemonic
    // Generate Masterseed and Code which has 12 English words.
    // if you want to create same address, you must put same code that you have created before into Mnomonic().
    // Below is an example that generate an address by using phrase so that you can  genreate same address.
    //  var code = new Mnomonic(phrase);
    // if you want to create new an address, try below.
    //  var code = new Mnomonic();
    // Use below when you want to create Bitcoin Address for testnet3
    //var Mseed = code.toHDPrivateKey(phrase2,keyNetwork);
    function createAddress(){
        var dfd = jQuery.Deferred();

        if(hash.length > 0 ){
            hash = hash.replace(/_/g, " ");
            code = new Mnemonic(hash);
            //If a user has the password, (2) Generate an address with Mnemonic + password.
            //If no, (3) Generate an address with Mnemonics
            if(password.length>0){
                Mseed = code.toHDPrivateKey(password);
            }else{
                Mseed = code.toHDPrivateKey();
            }
        }else{
            // Create a new address
            // If a user wants to set up password, (5) generate an address with new Mnemonic + password
            // If no, (6) Generate an address with new Mnemonic
            if(password.length > 0 ){
                code = new Mnemonic();
                newurl = (code.toString()).replace(/ /g, "_");
                // Codes for Password
                var userPassHash =  bitcore.crypto.Hash.sha256(new buffer.Buffer(password) );
                var passChk = userPassHash.toString('hex').substring(0, 10);
                location.replace("#" + newurl + "!" + passChk);
                Mseed = code.toHDPrivateKey(password);
            }else{
                code = new Mnemonic();
                newurl = (code.toString()).replace(/ /g, "_");
                location.replace("#" + newurl);
                Mseed = code.toHDPrivateKey();
            }
        }

        var hdPrivateKey = new bitcore.HDPrivateKey(Mseed);
        var derivedHdPrivateKey = hdPrivateKey.derive("m/44'/0'/0'/0/1");
        var privateKey = derivedHdPrivateKey.privateKey;
        //var derivedPrivateKey = hdPrivateKey.privateKey;
        //wif = derivedPrivateKey;
        var derivedHdPublicKey = derivedHdPrivateKey.hdPublicKey;
        var derivedPublicKey = derivedHdPublicKey.publicKey;
        address = derivedPublicKey.toAddress();
        wif = privateKey;
        var p = bitcore.PrivateKey.fromWIF(wif.toString());
        $(document).ready(function(){
             $('#qrcode').qrcode({                       //Bitcoin Address
                 width:100,
                 height:100,
                 text:address.toString()
            });
             $('#publicKey').text(address.toString());
        });

        return dfd.promise();
    }
    // Get History
    // There are some companys that offer Bitcoin APIs. However, some are not allowed us to use Ajax(CORS issue).
    // There is a list if companys provide APIs with Ajax.
    // OK) blockexplorer.com
    // NG) blockchain.info 
    function getTxHistory(address){
        $.ajax({
            type: "GET",
            url: url_tx + address,
            async: true,
            dataType: "json",
        })
          // Code to run if the request succeeds (is done);
          // The response is passed to the function
          .done(function( json ) {
            $('#history').find("tr:gt(3)").remove();
            $.each(json.txs, function(index, element) {
                var amount = 0;
                var inputsum = 0;
                var receiveflag = 0;
                // Transaction for recivieing
                $.each(json.txs[index].vin, function(i, inputs) {
                    if(inputs.addr != address){
                        $.each(json.txs[index].vout, function(j, outputs) {
                            if(outputs.scriptPubKey.hasOwnProperty('addresses')){
                                if(outputs.scriptPubKey.addresses[0] == address){
                                    amount = outputs.value;
                                    receiveflag = 1;
                                }
                            }
                            
                        });
                    }else{
                        inputsum += inputs.value;
                    }
                });
                // Transaction for sending
                if(receiveflag == 0){
                    $.each(json.txs[index].vout, function(i, outputs) {
                        if(outputs.scriptPubKey.hasOwnProperty('addresses')){
                            if(outputs.scriptPubKey.addresses[0] == address){
                                amount = -(inputsum - outputs.value);
                            }
                        }
                    });
                }
                    var trHTML = '<tr>';
                    // Input
                    trHTML += '<td>&nbsp;</td>';
                    trHTML += '<td align="left">' + moment(json.txs[index].time*1000).format( "MMM D YYYY h:mma" ) + '&nbsp;&nbsp;</td>';

                    trHTML += '<td  class="hidden-sm hidden-xs" align="left" text-overflow="ellipsis"><a target="_blank" href="http://blockchain.info/tx/' + json.txs[index].txid + '">' + (json.txs[index].txid).substring(0, 40) + '</a></td>';
                    trHTML += '<td align="left"><a target="_blank" href="http://blockchain.info/tx/' + json.txs[index].txid + '">'  + '...</a>' + '&nbsp;&nbsp;</td>';
                    trHTML += '<td  class="hidden-sm hidden-xs" align="right">' + json.txs[index].confirmations + '&nbsp;&nbsp;</td>';
                    if(amount >= 0){
                        trHTML += '<td align="right" class="BTC_IN">' + parseFloat(amount).toFixed(8) + '</td>';
                    }else{
                        trHTML += '<td align="right" class="BTC_OUT">' + parseFloat(amount).toFixed(8) + '</td>';
                    }
                    trHTML += '<td>&nbsp;</td></tr><tr><td>&nbsp;</td>';

                    trHTML += '</tr>';
                    $('#history tr:last').after(trHTML);
            });
            if(json.txs.length > 0){
                $("#nohistory").hide();
                $("#history").show();
            }else{
                $("#history").hide();
                $("#nohistory").show();
            }
          })
          // Code to run if the request fails; the raw request and
          // status codes are passed to the function
          .fail(function( xhr, status, errorThrown ) {
            showMessage(ERROR,MSG_HISTORY);
            $("#history").hide();
            $("#nohistory").show();
          })
          // Code to run regardless of success or failure;
          .always(function( xhr, status ) {
            //alert( "The request is complete!" );
          });
    }
    // Get balance with API
    function getBalance(address) {
        insight.getUnspentUtxos(address, function(err, utxos) {
          if (err) {
            showMessage(ERROR,MSG_BALANCE);
          } else {
            // Maybe use the UTXOs to create a transaction
            if(utxos.length > 0){
                // Sum of utxos that you have had so far.
                balance = 0;
                for(var i=0; i< utxos.length; i++){
                    balance += utxos[i]['satoshis'];
                }
                balance = balance * 1e-8;
                getCurrency(balance);
                $(document).ready(function(){
                    $('#balance').text(balance.toFixed(8) + ' BTC');
                });
            }else{
                getCurrency(balance);
                $(document).ready(function(){
                    $('#balance').text("0.00000000" + ' BTC');
                });
            }
          }
        });
    }
    // Calculate mining fees before broadcasting.
    // This fee is not exact same amount of fee when you actually broadcast because we can't calculate before you sign the transaction.
    function calcFee(){

        var privateKey = bitcore.PrivateKey.fromWIF(wif.toString());
        var send_address = document.getElementById("sendAddr").value;
        var amount = document.getElementById("txtAmount").value;

            // Convert BTC to satoshi;
            if(dex.useFiat){
                amount = parseFloat( amount ) / fiatvalue;
                amount = btcFormat( amount );
            }
            amount = parseInt((amount * 1e8).toFixed(0));
            message = "DEX " + $("#message").val();

            //Check unspentUtxos
            insight.getUnspentUtxos(address.toString(), function(err,utxos){
                if(err){
                    showMessage(ERROR,err);
                }else if(utxos.length >= 0){
                    // Sum of utxos that you have had so far.
                    var balance = 0;
                    for(var i=0; i< utxos.length; i++){
                        balance += utxos[i]['satoshis'];
                    }
                    try{
                        // If a user typed some comment, we will calc it as a part of the mining fee.
                        // addData is the function to add "OP_RETURN".
                        if(message.length > 0){
                            var transaction = new bitcore.Transaction()
                                .addData(message)
                                .from(utxos)
                                .to(send_address, amount)
                                .change(address)
                        }else{
                            var transaction = new bitcore.Transaction()
                                .from(utxos)
                                .to(send_address, amount)
                                .change(address)
                        }
                        // The next 2 lines are the code to estimate the mining fee.
                        // Signing size is about 48bytes so that we will calc how many inputs you will spend for utxos.
                        // Example:
                        //    If there are 2 utxos for the transaction's inputs, we will add 2 * 48bytes for the mining fee.
                        estsize = transaction._estimateSize() + (48 * utxos.length);
                        transaction
                            .fee(fee * estsize)
                            .sign(privateKey)

                        $("#miningfee").text((fee * estsize * 1e-8).toFixed(8));
                        var fiatValue = fiatvalue * fee * estsize * 1e-8;
                        fiatValue = fiatValue.toFixed(2);
                        $("#fiatfeePrice").html("(" + dex.getFiatPrefix() + formatMoney(fiatValue) + currency + ")");

                    } catch(err){
                        //showMessage(ERROR,"Unexpected error");
                    }
                }else{
                    $('#error').html("Not enougth BTC");
                        $("#error").fadeTo(5000, 500).slideUp(500, function(){
                        $("#error").slideUp(500);
                    });
                }
            });
    }
    // Send Bitcoin to another address
    function sendBitcoin() {
        var privateKey = bitcore.PrivateKey.fromWIF(wif.toString());
        var send_address = document.getElementById("sendAddr").value;
        var amount = document.getElementById("txtAmount").value;
        // Convert BTC to satoshi;
        if(dex.useFiat){
            amount = parseFloat( amount ) / fiatvalue;
            amount = btcFormat( amount );
        }
        amount = parseInt((amount * 1e8).toFixed(0));
        dispLoading();
        //Check unspentUtxos
        insight.getUnspentUtxos(address.toString(), function(err,utxos){
            if(err){
                showMessage(ERROR,err);
                removeLoading();
            }else if(utxos.length > 0){
                // Sum of utxos that you have had so far.
                var balance = 0;
                for(var i=0; i< utxos.length; i++){
                    balance += utxos[i]['satoshis'];
                }
                // Check if receiving address is valid and the amount is not empty
                if(send_address.length <= 0 || amount <= 0){
                    showMessage(ERROR, MSG_INVALIDADDR);
                    removeLoading();
                }else{
                    // Create a transaction
                    // denomination of amount and fee are "satoshi"
                    try{
                        if(message.length > 0){
                            var transaction = new bitcore.Transaction()
                                .addData(message)
                                .from(utxos)
                                .to(send_address, amount)
                                .change(address)
                                .fee(fee * estsize)
                                .sign(privateKey)
                        }else{
                            var transaction = new bitcore.Transaction()
                                .from(utxos)
                                .to(send_address, amount)
                                .change(address)
                                .fee(fee * estsize)
                                .sign(privateKey)
                        }
                    }
                    catch(err){
                        showMessage(ERROR,err);
                        removeLoading();
                    }
                    //handle serialization errors
                    if (transaction.getSerializationError()) {
                      //let error = transaction.getSerializationError().message;
                      var error = transaction.getSerializationError().message;
                      switch (error) {
                        case 'Some inputs have not been fully signed':
                            showMessage(ERROR,"Please check your private key");
                            removeLoading();
                            //break;
                        default:
                            showMessage(ERROR,error);
                            removeLoading();
                            return (error);
                      }
                    }else{
                        // error
                        //alert(error);
                        //removeLoading();
                    }
                    insight.broadcast(transaction, function(err, txid){

                        if (err) {
                            showMessage(ERROR,"Error in broadcast:" + err);
                            removeLoading();
                        } else {
                            removeLoading();
                            showMessage(SUCCESS,"You successfully sent!");
                            getBalance(address);
                            getTxHistory(address);
                            console.log(txid);
                            js_GetServerInfo("SEND",txid);
                        }
                    });
                }
            }else{
                $('#error').html("Not enougth BTC");
                    $("#error").fadeTo(5000, 500).slideUp(500, function(){
                    $("#error").slideUp(500);
                });
                removeLoading();
            }
        });
    }
    // Scan QRcode
    // The original library(dwa012/html5-qrcode) has a issue which is "Camera view hang when running it on mobile #8".
    // But also there is a fork to solve it, so I used the fork library as followed "enriquetuya/html5-qrcode"
    function scanQRcode(){
        $('#reader').empty();
        $('#reader').html5_qrcode(function(data){
                var scanArr = data.split("?");
                if(scanArr.length > 1){
                    document.getElementById('txtAmount').value = scanArr[1].replace('amount=','');
                    //$("#changeType").trigger("click");
                }
                document.getElementById('sendAddr').value = scanArr[0].replace('bitcoin:','');
                
                try{
                    //$('#reader').html5_qrcode_stop();
                    //$('#reader').html5_qrcode().stop();
                    if (!!window.stream) {
                        stream.getTracks().forEach(function (track) { track.stop(); });
                    }
                    $('#reader').value = null;
                    $("#ScannerModal").modal("hide");
                } catch(err){
                    console.log(err);
                }
            },
            function(error){
            //show read errors 
            }, function(videoError){
            //the video stream could be opened
            }
        );
    }
    // Stop Scanner
    function stopCamera(){
        try{
            //$('#reader').html5_qrcode_stop();
            //$('#reader').html5_qrcode().stop();
            if (!!window.stream) {
                stream.getTracks().forEach(function (track) { track.stop(); });
            }
            $('#reader').value = null;
        } catch(err){
            console.log(err);
        }
    }
    // Get currency with API
    function getCurrency(balance){
        $.ajax({
            type: "GET",
            url: url_currency,
            async: true,
            dataType: "json",
        })
        .done(function( json ) {
            objCurrency = json;// Store the json to use settingCurrecny.
            fiatvalue = json[currency].last;
            sym = json[currency].symbol;
            $(document).ready(function(){
                $('#currency').text(' ≈ ' + sym + (balance*fiatvalue).toFixed(2) + currency);
                var i;
                for ( i in json ){
                    $("#currencySelect").append( "<option value='" + i + "'>" + i + "</option>" );
                }
            });
          })
        .fail(function( xhr, status, errorThrown ) {
            showMessage(ERROR,MSG_CURRENCY);
          })
        .always(function( xhr, status ) {
            //alert( "The request is complete!" );
          });
    }
    // GenerateQRcode by using GoogleAPI
    function generateQRcode(){
        var amount = $("#Recamount").val();
        if ( dex.useFiat2 )
        {
            amount = parseFloat( amount ) / fiatvalue;
            amount = btcFormat( amount );
        }
        $("#receiveQR").attr("src", url_receiving + this.address + "%3Famount%3D" + amount + "&chld=H|0");
        $("#generateAmount").html(amount);
        $("#generateAddress").html(this.address.toString());
    }
    // Get currency with API
    function getBitcoinFee(){
        $.ajax({
            type: "GET",
            url: url_fee,
            async: true,
            dataType: "json",
        })
        .done(function( json ) {
            $(document).ready(function(){
                    var i;
                    var feeText = ["/byte (Recommended)","/byte (Half hour)","/byte (Hour)"];
                    var f = 0;
                    for ( i in json ){
                        $("#feeSelect").append( "<option value='" + json[i] + "'>" + json[i] + feeText[f] + "</option>" );
                        f++;
                    }
                    fee = parseInt(json["fastestFee"]);
                    $("#txtFeeAmount").val(fee);
                });
          })
          .fail(function( xhr, status, errorThrown ) {
            showMessage(ERROR,MSG_FEE);
          })
          .always(function( xhr, status ) {
            //alert( "The request is complete!" );
          });
    }



    // Show Loading Modal
    function dispLoading(){
        var h = $(window).height();
        $('#loader-bg ,#loader').height(h).css('display','block');
    }
    // Remove Loading Modal
    function removeLoading(){
        $('#loader-bg').delay(900).fadeOut(800);
        $('#loader').delay(600).fadeOut(300);
    }
    function showMessage(str,msg){
        if(str == ERROR){
            $('#errorMsg').html(msg);
            $("#error").fadeTo(9000, 500);
        }else if(str == SUCCESS){
            $('#success').html(msg);
                $("#success").fadeTo(9000, 500).slideUp(500, function(){
                $("#success").slideUp(500);
            });
        }else if(str == WRONGPASSWORD){
            $('#wrongPassword').html(msg);
                $("#wrongPassword").fadeTo(9000, 500).slideUp(500, function(){
                $("#wrongPassword").slideUp(500);
            });
        }else{
            alert("something wrong...");
        }
    }
    function setCookie(cookieName,cookieValue,nDays) {
        var today = new Date();
        var expire = new Date();
        if (nDays==null || nDays==0) nDays=1;
        expire.setTime(today.getTime() + 3600000*24*nDays);
        document.cookie = cookieName+"="+escape(cookieValue) + ";expires="+expire.toGMTString();
    }
    function readCookie(cookieName) {
        var theCookie=" "+document.cookie;
        var ind=theCookie.indexOf(" "+cookieName+"=");
        if (ind==-1) ind=theCookie.indexOf(";"+cookieName+"=");
        if (ind==-1 || cookieName=="") return "";
        var ind1=theCookie.indexOf(";",ind+1);
        if (ind1==-1) ind1=theCookie.length; 
        return unescape(theCookie.substring(ind+cookieName.length+2,ind1));
    }
    function openTab(evt, tabName) {
        // Declare all variables
        var i, tabcontent, tablinks;

        // Get all elements with class="tabcontent" and hide them
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }

        // Show the current tab, and add an "active" class to the button that opened the tab
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }
    function formatMoney(x){
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function btcFormat(amount){
        var amount = amount.toFixed(8);
        return amount;
    }
    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition);
        } else { 
            console.log("Geolocation is not supported by this browser.");
        }
    }
    function showPosition(position) {
        if(position.coords.latitude != null){
            lat = position.coords.latitude;
        }
        if(position.coords.longitude != null){
            lng = position.coords.longitude;
        }
        if(position.coords.altitude != null){
            alt = position.coords.altitude;
        }
        console.log("latitude: " + lat);
        console.log("longitude: " + lng);
        console.log("altitude: " + alt);
    }
    function js_AjaxCall(cbfunc) {     // this is the only AJAX call, supply callback   
        jsonString=JSON.stringify(jsonArray);
        $.ajax({
              dataType: 'json',
              method: 'POST',
              url: url_dex,
              data: jsonString
            })
        .done(function( json ) {
            console.log(json);
            if(cbfunc == 'js_GetEncryption'){
                console.log(json.Documentation.NOW);
            }
        });
    }
    /**
    function success(response) {
          jsonString=JSON.stringify(response);
            tmp = JSON.stringify(response, null, 4);
    }
    **/
    function js_GetServerInfo(event, data) {
          jsonString = '{"Documentation":{"REQ":"","REP":"","LOG":"","URL":"","TID":"","LAT":"","LNG":"","ALT":""}}';
          jsonArray = JSON.parse ( jsonString );
          switch(event){
            case "LOGIN":
                jsonArray.Documentation.REQ='SERVER';
                jsonArray.Documentation.LOG='*** LOGIN ***';
                jsonArray.Documentation.LAT=lat.toString();
                jsonArray.Documentation.LNG=lng.toString();
                jsonArray.Documentation.ALT=alt.toString();
                break;
            case "SEND":
                jsonArray.Documentation.REQ='SERVER';
                jsonArray.Documentation.LOG='*** SEND ***';
                jsonArray.Documentation.TID= data;
                jsonArray.Documentation.LAT=lat.toString();
                jsonArray.Documentation.LNG=lng.toString();
                jsonArray.Documentation.ALT=alt.toString();
                break;
            case "CREATE":
                jsonArray.Documentation.REQ='SERVER';
                jsonArray.Documentation.LOG='*** CREATE ***';
                jsonArray.Documentation.LAT=lat.toString();
                jsonArray.Documentation.LNG=lng.toString();
                jsonArray.Documentation.ALT=alt.toString();
                break;
            default:
                jsonArray.Documentation.LOG='*** Something else ***';
          }
          js_AjaxCall('js_GotServerInfo');
    }
    function js_GetEncryption(event, data) {

        var url;
        jsonString = '{"Documentation":{"REQ":"","REP":"","LOG":"","URL":"","TID":"","LAT":"","LNG":"","ALT":""}}';
        jsonArray = JSON.parse ( jsonString );
        switch(event){
            case "ENCRYPT":
                jsonArray.Documentation.REQ='ENCRYPT';
                jsonArray.Documentation.LOG= data;
                jsonArray.Documentation.LAT=lat.toString();
                jsonArray.Documentation.LNG=lng.toString();
                jsonArray.Documentation.ALT=alt.toString();
                break;
            case "DECRYPT":
                jsonArray.Documentation.REQ='DECRYPT';
                jsonArray.Documentation.LOG= data;
                jsonArray.Documentation.LAT=lat.toString();
                jsonArray.Documentation.LNG=lng.toString();
                jsonArray.Documentation.ALT=alt.toString();
                break;
            default:
                jsonArray.Documentation.LOG='*** Something else ***';
        }
        url = js_AjaxCall('js_GetEncryption');

      }
/********************** end of functions *********************************/
