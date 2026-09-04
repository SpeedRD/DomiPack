/* ---- inline #0 ---- */

	
	

        function VerificarRua() {
            var TokenID = document.getElementById("TokenID").value;
            var Tipo = "";
            var Cedula = document.getElementById("ddTipo").value;
            if (Cedula == "Personal") {
                Tipo = "Cedula";
                ID = document.getElementById("Identificacion").value;
            } else if (Cedula == "Corporativo") {

                Tipo = "RNC";
                ID = document.getElementById("iRNC").value;

            } else {
                Tipo = "Pasaporte";
                ID = document.getElementById("Identificacion").value;
            }


            $.ajax({
                type: "Get",
                url: "WebService1.asmx/RuaVerify",
                dataType: "Text",
                ContentType: "text/html; charset=utf-8",
                data: "TokenID=" + TokenID + "&ID=" + ID + "&Tipo=" + Tipo,

                success: function (data) {

                    if (data == "false") {
                        $("#ckRua").removeAttr("checked");
                    } else {
                        $('#ckRua').prop('checked', data);
                    }
                    console.log(data);
                },
                error: function (err) {
                    alert(err);
                }
            })
        }


        function change() {

            var Cedula = document.getElementById("ddTipo").value;
            if (Cedula == "Personal") {
                document.getElementById("dCedula").style.display = '';
                document.getElementById("dRnc").style.display = 'none';
                document.getElementById("dRnc1").style.display = 'none';
                document.getElementById("DFechaNacimiento").style.display = '';
            } else if (Cedula == "Corporativo") {

                document.getElementById("dCedula").style.display = 'none';
                document.getElementById("dRnc").style.display = '';
                document.getElementById("dRnc1").style.display = '';
                document.getElementById("iRNC").placeholder = "RNC";
                document.getElementById("lrnc").innerText = "RNC";
                document.getElementById("DFechaNacimiento").style.display = 'none'; 
				document.getElementById("tbFecha").removeAttribute("required");

            } else {
                document.getElementById("dCedula").style.display = 'none';
                document.getElementById("dRnc").style.display = '';
                document.getElementById("lrnc").innerText = "Pasaporte";
                document.getElementById("iRNC").placeholder = "Pasaporte";
                document.getElementById("dRnc1").style.display = 'none';

            }
        }
        function valida_cedula(ced) {
            var Cedula = document.getElementById("ddTipo").value;
            if (Cedula == "Personal") {
                var c = ced.replace(/-/g, '');
                var Cedula = c.substr(0, c.length - 1);
                var Verificador = c.substr(c.length - 1, 1);
                var suma = 0;
                if (ced.length < 11) { swal("La Cedula es Falta Caracteres", "Informacion", "info"); return false; }
                for (i = 0; i < Cedula.length; i++) {
                    mod = "";
                    if ((i % 2) == 0) { mod = 1 } else { mod = 2 }
                    res = Cedula.substr(i, 1) * mod;
                    if (res > 9) {
                        res = res.toString();
                        uno = res.substr(0, 1);
                        dos = res.substr(1, 1);
                        res = eval(uno) + eval(dos);
                    }
                    suma += eval(res);
                }
                el_numero = (10 - (suma % 10)) % 10;
                console.log(el_numero);
                if (el_numero == Verificador && Cedula.substr(0, 3) != "000") {

                    document.getElementById("tbFecha").removeAttribute("disabled");
                    document.getElementById("Email").removeAttribute("disabled");
                    document.getElementById("tbContacto").removeAttribute("disabled");

                    document.getElementById("ltelefono").removeAttribute("disabled");

                    document.getElementById("lcelular").removeAttribute("disabled");

                    document.getElementById("Password").removeAttribute("disabled");
                    document.getElementById("tbFecha").removeAttribute("disabled");
                }
                else {
                    alert("La Cedula es Ilegal");
                    document.getElementById("Email").setAttribute("disabled", "disabled");

                    document.getElementById("ltelefono").setAttribute("disabled", "disabled");

                    document.getElementById("lcelular").setAttribute("disabled", "disabled");

                    document.getElementById("Password").setAttribute("disabled", "disabled");

                }
            } else {

                document.getElementById("tbFecha").removeAttribute("disabled");
                document.getElementById("Email").removeAttribute("disabled");
                document.getElementById("tbContacto").removeAttribute("disabled");

                document.getElementById("ltelefono").removeAttribute("disabled");

                document.getElementById("lcelular").removeAttribute("disabled");

                document.getElementById("Password").removeAttribute("disabled");
               
            }
            VerificarRua();
        }


        function Guardar() {
            document.getElementById("bsendConfi").click();
        }


        function GetDataCliente() {

            $(".se-pre-con").fadeIn("slow");;
            var TokenID = document.getElementById("TokenID").value;
            var stringData = "";
            var Tipo = "0";
            var Cedula = document.getElementById("ddTipo").value;
            if (Cedula == "Personal") {
                stringData = document.getElementById("Identificacion").value;
                stringData = document.getElementById("Identificacion").value;
                $.ajax({
                    type: "Post",
                    url: "WebService1.asmx/GetNombreCedula",

                    dataType: "Text",
                    ContentType: "text/html; charset=utf-8",
                    data: "rncCedula=" + stringData + "&TokenID=" + TokenID,

                    success: function (data) {

                        console.log(data);
                        var res = data.split("|");
                        document.getElementById("Nombre").value = res[0];
                        document.getElementById("tbFecha").value = res[1];
                        document.getElementById("tbFecha").removeAttribute("disabled");
                        document.getElementById("Email").removeAttribute("disabled");
                        document.getElementById("tbContacto").removeAttribute("disabled");

                        document.getElementById("ltelefono").removeAttribute("disabled");

                        document.getElementById("lcelular").removeAttribute("disabled");

                        document.getElementById("Password").removeAttribute("disabled");
                        document.getElementById("tbFecha").removeAttribute("disabled");
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                    }

                });
            }
            else
                if (Cedula == "Corporativo") {
                    stringData = document.getElementById("iRNC").value;
                    Tipo = "1";
                };

            if (Tipo == "0") {
                $.ajax({
                    type: "Post",
                    url: "WebService1.asmx/GetNombreRNC",

                    dataType: "Text",
                    ContentType: "text/html; charset=utf-8",
                    data: "rncCedula=" + stringData + "&TokenID=" + TokenID,

                    success: function (data) {

                        console.log(data);
                        document.getElementById("Nombre").value = data;
                        document.getElementById("tbFecha").removeAttribute("disabled");
                        document.getElementById("Email").removeAttribute("disabled");
                        document.getElementById("tbContacto").removeAttribute("disabled");

                        document.getElementById("ltelefono").removeAttribute("disabled");

                        document.getElementById("lcelular").removeAttribute("disabled");

                        document.getElementById("Password").removeAttribute("disabled");
                        document.getElementById("tbFecha").removeAttribute("disabled");
                        document.getElementById("tbFecha").removeAttribute("disabled");
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                    }

                });
            } else {
                $.ajax({
                    type: "Post",
                    url: "WebService1.asmx/GetNombreRNC",

                    dataType: "Text",
                    ContentType: "text/html; charset=utf-8",
                    data: "rncCedula=" + stringData + "&TokenID=" + TokenID,

                    success: function (data) {

                        console.log(data);
                        document.getElementById("Nombre").value = data;
                        document.getElementById("tbFecha").removeAttribute("disabled");
                        document.getElementById("Email").removeAttribute("disabled");
                        document.getElementById("tbContacto").removeAttribute("disabled");

                        document.getElementById("ltelefono").removeAttribute("disabled");

                        document.getElementById("lcelular").removeAttribute("disabled");

                        document.getElementById("Password").removeAttribute("disabled");
                        document.getElementById("tbFecha").removeAttribute("disabled");
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                    }

                });


            }
            VerificarRua();

            $(".se-pre-con").fadeOut("slow");;

        }
    

/* ---- inline #1 ---- */



        function Confirmar(titulo, message, tipo, tituloPrint) {


            swal.fire({
                title: titulo,
                text: tituloPrint,
                icon: tipo,
                buttons: [
                    'No!',
                    'Yes!'
                ],
                dangerMode: true,
            }).then(function (isConfirm) {
                if (isConfirm) {
                    swal({
                        title: titulo,
                        text: 'se esta Procesando la Informacion',
                        icon: 'success'
                    }).then(function () {
                        Guardar();
                    });
                } else {
                    swal(titulo, message, tipo);
                }
            });
        }

        function SetSession(s) {
            document.getElementById("lsClienteID").value = s;

            document.getElementById("SetCliente").click();


        }
    

/* ---- inline #2 ---- */

//<![CDATA[
var theForm = document.forms['ctl00'];
if (!theForm) {
    theForm = document.ctl00;
}
function __doPostBack(eventTarget, eventArgument) {
    if (!theForm.onsubmit || (theForm.onsubmit() != false)) {
        theForm.__EVENTTARGET.value = eventTarget;
        theForm.__EVENTARGUMENT.value = eventArgument;
        theForm.submit();
    }
}
//]]>


/* ---- inline #3 ---- */

		   
            $(window).load(function () {
                // Animate loader off screen
               
				cbMedioiD.value="04";
            });
        

/* ---- inline #4 ---- */

            $(window).load(function () {
                // Animate loader off screen 
const params = new URLSearchParams(window.location.search)
                document.getElementById("cbMedioiD").value = params.get('medio');
			
	
				
            });
			
			
        

/* ---- inline #5 ---- */

            $(window).load(function () {
                // Animate loader off screen
				
lSucursal.addEventListener("select", logSelection);
                $(".se-pre-con").fadeOut("slow");; 
            });
		 		
				 function logSelection(event) {
  const log = document.getElementById("log");
  const selection = event.target.value.substring(
    event.target.selectionStart,
    event.target.selectionEnd,
  );
  log.textContent = `You selected: ${selection}`;
}
        

/* ---- inline #6 ---- */

                                    $("#ckDomicilio").on("click", function () {
                                        if ($("#ckDomicilio")[0].checked) {
                                            document.getElementById("Ddireccion").style.display = "";
                                        } else {
                                            document.getElementById("Ddireccion").style.display = "none";
                                        }
                                    });
                                

/* ---- inline #7 ---- */

<!--
ASPx.AddHoverItems('mContrato',[[['dxheErrorFrameCloseButtonHover_Office365'],[''],['EFCB']]]);
ASPx.InitializeSVGSprite();
ASPx.createControl(ASPxClientHtmlEditor,'mContrato','',{'callBack':function(arg) { WebForm_DoCallback('mContrato',arg,ASPx.Callback,'mContrato',ASPx.CallbackError,true); },'stateObject':{'cssFiles':['/DXR.axd?r=0_4872-4oArn&p=ab775575'],'clientState':'ActiveView|7|PreviewCurrentWidth|3|100CurrentHeight|3|380IsPercentWidth|1|1Ribbon|0|'},'systemCssFile':'/DXR.axd?r=4_117-3oArn','appDomainPath':'//','processRtfContentPastingOnServer':true,'html':'<div class="row">\r\n                                     <div class="col-md-2 col-sm-1 col-lg-3"></div>\r\n                                     <div class="col-md-8 col-sm-10 col-lg-6">\r\n                                    <div class="content-socio">\r\n                    \t\t       <div class="mb-4 scrollContenido">\r\n                                <p><strong>\r\n                                        POR FAVOR LEA DETENIDAMENTE ESTOS TÉRMINOS Y CONDICIONES, ANTES DE REGISTRARSE EN EL PROGRAMA DE MEMBRESÍA DE EPS INTERNACIONAL LTD. SU PARTICIPACIÓN EN DICHO PROGRAMA IMPLICA QUE ACEPTA EXPRESAMENTE ESTOS TÉRMINOS Y CONDICIONES. EN CASO DE NO ACEPTARLOS, NO SE REGISTRE.\r\n                                    </strong>\r\n                                </p>\r\n\r\n                                                    <p class="text-center"><strong>SOLICITUD MEMBRESÍA</strong></p>\r\n\r\n<br />\r\n\r\n<p class="text-justify">Entre: De una parte la sociedad EPS, , constituida de acuerdo a las leyes dominicanas, con su domicilio social ubicado en la avenida José Ortega y Gasset esquina Padre Fantino Falco, Ensanche Naco, de esta ciudad de Santo Domingo, debidamente representada por quien firma por ella el presente contrato, lo cual en lo que sigue se llamará EPS, una compañía dedicada a suministrar servicios de transporte de mercancías, documentos y transporte Courier en la República Dominicana y de la otra parte ____________________________________________________________, con su domicilio en ____________________________________________________________________________________________________________________________________________________________________________, debidamente representada por ________________________________________________, en calidad de _______________________, de nacionalidad ________________________, portador de la cédula de identidad personal ________________________, quien en lo adelante del presente contrato se denominara EL CLIENTE , y a quien a la firma de este contrato se le asignara un código de identificación EPS No. _________________________.</p>\r\n\r\n<br />\r\n\r\n<p class="text-justify"><strong>PREÁMBULO</strong></p>\r\n\r\n \r\n\r\n<p class="text-justify">\r\nPOR CUANTO: Los términos y condiciones que se indican a continuación, constituyen el contrato que se celebra entre usted (en lo adelante EL CLIENTE), como remitente del envío, y EXPRESS PARCEL SERVICES INTERNATIONAL INC., (en lo adelante EPS).\r\n<br />POR CUANTO: Para todos los efectos legales y contractuales, el cliente es el cargador del envío a que se refiere esta orden de servicio, actuando EPS únicamente a nombre y representación de este.\r\n<br />POR CUANTO: Ambas partes desean suscribir un convenio que regule sus relaciones en el porvenir mediante, en el cual se definan las obligaciones de cada parte, así como las definiciones de los términos a ser utilizados en el mismo.\r\n<br />EL CLIENTE está interesado en obtener los servicios ofertados por EPS y está dispuesto a pagar por los mismos, como más adelante se indicará.\r\n<br />POR TANTO: En el entendido de que el anterior preámbulo forma parte integral de este Contrato, las partes libremente y de común acuerdo:\r\n</p><br />\r\n\r\n \r\n\r\n<p class="text-center"><strong>HAN CONVENIDO Y PACTADO LO SIGUIENTE</strong></p><br />\r\n<strong>Artículo primero. Objeto del Contrato:</strong><br />\r\n<p class="text-justify">1.1. EL CLIENTE reconoce que, a partir de la aceptación del presente contrato, contrata los servicios de EPS para que le brinde el servicio de Courier y Carga y otros servicios indicados en el artículo 4 del presente contrato, de conformidad con los términos aquí enunciados. La prestación de estos servicios conllevará que EL CLIENTE adquiera el derecho de disponer de las direcciones físicas y apartados postales con los que cuenta EPS en el extranjero, para lo cual EL CLIENTE debe acogerse a todas las disposiciones del presente acuerdo.\r\n<br />1.2. Como consecuencia de lo anterior EPS está en la obligación de transportar los servicios que le encargue EL CLIENTE, de conformidad con lo establecido en el presente documento. Para los fines de este acuerdo, se entiende por envío todas las correspondencias, paquetes o bultos que viajen bajo dicho contrato. EL CLIENTE se compromete a proporcionar los detalles del envío, de manera completa, exacta y suficiente para ubicar el domicilio del destinatario.</p><br />\r\n\r\n<strong>Artículo segundo. Identificación para uso de membresía:</strong><br />\r\n<p class="text-justify">2.1. EPS facilitará al cliente la afiliación electrónica vía web, la cual se lleva a cabo llenando cada espacio requerido del formulario de afiliación, donde se encuentran plasmadas las normas de transporte y políticas de envío, confidencialidad y seguridad del comercio. Antes de retirar el primer paquete, debe firmar el documento de confirmación de afiliación y términos y condiciones en las oficinas de EPS y recibir un carnet de afiliación.\r\n\r\n<br />2.2. Por medio de la afiliación electrónica, se le asigna un número de usuario y clave al CLIENTE para acceder al sistema y manejar su carga por medio de este Contrato, el cliente inmediatamente accede a su usuario virtual tiene la opción de cambiar su nombre de usuario y contraseña.\r\n\r\n<br />2.3. EPS dotará a EL CLIENTE de un carnet de identificación que deberá presentar para poder retirar o depositar sus correspondencias, paquetes o bultos en las oficinas de EPS.\r\n\r\n<br />2.4. En los casos en que el contrato sea entre una persona física y LA EMPRESA, EL CLIENTE puede autorizar personas para recoger el paquete, siendo el CLIENTE titular el único responsable por los pagos de todo lo recibido en la cuenta y la cancelación de la misma. Estas autorizaciones pueden ser realizadas por el cliente, presentándose a un representante de servicios en las oficinas de la empresa o enviando un correo electrónico a nuestro departamento de servicio al cliente y membresías.\r\n\r\n<br />2.4.1. El cliente, tanto si es persona física (y ha designado un representante), o jurídica, debe informar de forma escrita con tiempo de antelación, si ha habido algún cambio en la identidad de la persona designada como representante autorizado a retirar los paquetes. A falta de esta comunicación, EPS entregará los paquetes a quien figure como representante autorizado en nuestros archivos.\r\n\r\n<br />2.5. Cuando el contrato se suscribe con una persona jurídica, los envíos deben de consignarse únicamente a la razón social y a la atención de cualquier funcionario autorizado que labore para la compañía, siendo la empresa afiliada responsable por el manejo de la cuenta. Le queda prohibido al CLIENTE ceder a ningún título el presente contrato sin el consentimiento previo y escrito de EPS. Si el suscriptor contraviniere esta estipulación, la cesión no tendrá efectos jurídicos. Las partes establecen que el servicio a ser provisto por EPS, podrá estar sustentado en documentos generados virtualmente, por lo cual queda establecido que el presente contrato se ampara en la Ley de Comercio Electrónico y Firmas Digitales promulgada el 4 de septiembre del 2002;\r\n\r\n<br />2.6. EPS solo entregará correspondencia, paquetes o bultos contra la validación de su número de afiliado y su cédula de identidad o pasaporte que avale que se trata de la persona a la cual le fue expedido el número de afiliado.\r\n\r\n<br />2.7. En caso de que la persona a la cual le fue expedido el carnet de membresía donde conste el número de afiliado, le sea imposible retirar personalmente su correspondencia o paquete, debe proceder conforme a lo establecido en el artículo 2.4. La persona que EL CLIENTE envíe a recoger el paquete o la correspondencia deberá presentar su cédula de identidad para identificarla como persona autorizada. En caso de no presentarse las condiciones establecidas en el presente artículo, EPS no entregará las correspondencias, paquetes y/o bultos, hasta tanto se cumplan con estas disposiciones, debiendo presentar EL CLIENTE la evidencia escrita de que informó a EPS sobre la designación de su representante.\r\n\r\n</p><br />\r\n\r\n \r\n\r\n<strong>Artículo tercero. Dirección:</strong><br />\r\n\r\n<p class="text-justify">3.1. Para recibir su correspondencia y paquetes a través de EPS, EL CLIENTE debe informar a sus remitentes que toda su correspondencia yo paquetes deben ser enviados a la siguiente dirección: </p> <br />\r\n\r\n<p class="text-justify">\r\n\r\nCorrespondencia                                                      Paquetes <br />\r\n\r\nNombre del Suscriptor                                            Nombre del Suscriptor<br />\r\n\r\nP.O. Box 02-5650                                                      8260 N.W. 14th street. <br />\r\n\r\nEPS _________                                                         EPS_________<br />\r\n\r\nMiami, FL. 33102-5650                                                     Miami, FL. 33191-1501\r\n\r\n</p><br />\r\n\r\n<p class="text-justify">3.2. En caso de que nuestra dirección en Miami sea modificada, se le comunicará al CLIENTE por nuestra página web, prensa nacional, publicidad a través de medios digitales y correo electrónico o de nuestra página web.\r\n3.3. Una vez el paquete llegue a los depósitos y almacenes de EPS en Miami, USA, EPS enviará una notificación de arribo vía correo electrónico de que el paquete llegó a Miami y ha sido embarcado. Luego recibirá otra notificación de que el paquete se encuentra disponible para ser retirado.\r\n<br />3.4. La afiliación al casillero internacional es gratuita. El cliente únicamente pagará los costos relacionados con el envío, transporte y manejo de mercancía, gestiones aduanales, flete aéreo  aplicables en el país, según disposiciones aduanales y tributarias existentes.\r\n\r\n</p><br />\r\n\r\n \r\n\r\n<strong>Artículo cuarto. Servicios ofertados.</strong><br />\r\n<p class="text-justify">4.1. Los servicios ofrecidos por EPS son los siguientes:\r\na)            La recepción en las direcciones de EPS en el extranjero de las correspondencias, paquetes y bultos que sean debidamente dirigidos a EL CLIENTE y el transporte de los mismos hacia la República Dominicana;\r\n<br />b)               El envío al extranjero de las correspondencias, paquetes y bulto (s) debidamente entregado (s) por EL CLIENTE en las oficinas de EPS en la República Dominicana, de conformidad con las instrucciones específicas de EL CLIENTE, las cuales podrán ser: a) Entregar al correo americano; b) Entregar a una empresa privada de transporte terrestre, aéreo o marítimo;\r\nEn cualesquiera de los casos arriba mencionados, las correspondencias, paquetes y bultos, serán manejados de acuerdo al tipo y clasificación de (los) servicio (s) escogido (s) por EL CLIENTE\r\n<br />c)<strong>        Servicios de sellos:</strong> Consiste en la colocación de los sellos postales que le hagan falta a la correspondencia enviada por EL CLIENTE a través de EPS. EL CLIENTE pagará adicionalmente por la colocación de sellos y por los costos de los servicios de EPS.\r\n<br />d)<strong>       Servicio de Mensajería local:</strong> Consiste en recoger o enviar en el territorio nacional las correspondencias, paquetes y bultos que EL CLIENTE reciba o desee enviar a través de EPS.  El costo será de acuerdo a la tarifa vigente en el mercado, incluida en nuestro tarifario presente en todas nuestras sucursales EPS y en nuestra página web.\r\n<br />e)<strong>       Servicio de Orden:</strong> Consiste en asistir a EL CLIENTE en la colocación de la orden que EL CLIENTE hace a su suplidor en el extranjero. EL CLIENTE pagará directamente a su suplidor por el valor de su compra y pagará a EPS los valores generados por el servicio de transporte.\r\n<br />f)<strong>        Servicio de Seguro:</strong> Consiste en que EPS realice los trámites necesarios con una compañía de seguros aceptada por EL CLIENTE, para asegurar los bienes transportados por EPS cuando éstos sobrepasen el valor de los doscientos (US$200.00) dólares. En ese caso, EL CLIENTE deberá pagar la póliza por él elegida. EL CLIENTE entiende y acepta que en los casos que no solicite o decline este servicio, EL CLIENTE se hace único responsable de los daños y perjuicios a que puedan ser objeto los bienes transportados.\r\n<br />g)<strong>        Servicio de Aduanas:</strong> EPS realizará por su cuenta y en nombre de EL CLIENTE las gestiones aduanales exigidas por las leyes dominicanas. EL CLIENTE es el responsable del pago de los derechos e impuestos, multas y sanciones que pudieran generarse por el manejo aduanal de sus mercancías, así como de los gastos en que pudiera incurrir EPS para los trámites aduanales correspondientes a sus paquetes, conforme al tarifario vigente incluida en nuestro tarifario presente en todas nuestras sucursales EPS y en nuestra página web.\r\nEn caso de que el cliente decida realizar por su parte los trámites aduanales, este deberá realizar a EPS la solicitud por escrito.\r\n<br />h)<strong>       Servicio de mensajería en el extranjero:</strong> Consiste en recoger las correspondencias, paquetes y bultos de EL CLIENTE en la dirección en el extranjero que el indique o la dirección seleccionada por EPS. EL CLIENTE reembolsará a EPS los gastos en que haya incurrido en la ejecución de esta gestión, plasmando dentro de la factura el detalle de estos gastos.\r\n<br />i)<strong>         Servicio COD (Servicio complementario cobro contra entrega):</strong> Consiste en asistir a EL CLIENTE en la tramitación de los pagos relacionados con las mercancías. Estos pagos son por el valor de la mercancía, servicio de entrega, garantías, adquisiciones o preparación de embalaje.\r\n<br />j)<strong>         Carga marítima:</strong> es la solución para el transporte de carga pesada, suelta o contenedores, importación o exportación. Tu carga pesada llegará de forma correcta y segura a cualquier parte del mundo donde EPS tenga representante, de conformidad con nuestro acuerdo internacional con la United Shipping Association.\r\n<br />k)<strong>        Carga aérea:</strong> es el transporte de tu carga pesada que requiere de mayor rapidez a un mejor precio. Desde 100 libras con orígenes en Miami, Europa y Asia.\r\n<br />l)<strong>         Compras por internet (e-shopping):</strong> servicios de compra online y por catálogos en las oficinas de EPS. Te brindamos asesoría en la búsqueda de mejores ofertas.\r\n<br />m)<strong>      Otros Servicios:</strong> EPS podrá ofrecer otros servicios como manejo de aduanas en los países de origen o destino, embalaje, seguros, garantías, compras, transporte interno, segregación, revisión y cualquier otro servicio relacionado al manejo y transporte de carga, a requerimiento de EL CLIENTE, que se entienda facilite para EPS la prestación del servicio de transporte mediante este contrato, debiendo EL CLIENTE reembolsar a EPS los gastos en que haya incurrido en esos servicios utilizados, previa presentación de factura por EPS.\r\n</p><br />\r\n\r\n<strong>Artículo quinto. Costo del servicio:</strong><br />\r\n\r\n<p class="text-justify">5.1. EPS cobrará al EL CLIENTE el valor mínimo, hasta no más de una (01) libra de peso por la mercancía transportada desde o hacia el extranjero, de acuerdo a la tarifa de precios vigente al momento de la facturación, más los cargos adicionales como pueden ser ajuste de combustible, Dirección General de Aduanas (DGA), impuestos aduanales en caso de que apliquen y garantía, desglosados dentro de la factura correspondiente.\r\n<br />5.2. Impuestos. Deberán ser pagados a EPS dentro del plazo de los tres (03) días contados a partir del día del arribo del o de los paquetes al país, tanto para los clientes corporativos como para las personas físicas. EPS avanzará el pago de impuestos ante la DGA (Dirección General de Aduanas) por cuenta del cliente, con la finalidad de que la mercancía esté disponible dentro de las oficinas de EPS en Santo Domingo y demás sucursales, para brindarle un mejor servicio al cliente.\r\n<br />5.2.1. Para las personas físicas, los impuestos podrán ser reembolsados a EPS con tarjeta de crédito hasta la suma de RD$5,000.00 pesos; si los impuestos sobrepasan dicha suma deberán ser pagados a EPS por transferencia bancaria o dinero en efectivo.\r\n<br />5.3. En caso de que EL CLIENTE no haya retirado sus correspondencias, paquetes y bultos de las oficinas de EPS dentro del plazo de treinta (30) días contados a partir de la recepción de las mismas por EPS, EPS cobrará a EL CLIENTE un cargo por almacenaje mensual de un 5% del valor del transporte. El cliente será notificado vía correo electrónico de la llegada de su paquete y recibirá notificaciones cada 30 días de haber recibido su paquete vía correo electrónico, en caso de no haberlo retirado. En caso de que el cliente no haya retirado su mercancía en un plazo de noventa (90) días, EL CLIENTE autoriza a EPS a disponer de toda la correspondencia, paquete y bultos, en la forma que estime conveniente.\r\n<br />5.4. El precio de los servicios ofertados mediante este contrato está sujeto a ser modificado por EPS, bajo aviso con quince (15) días de antelación al CLIENTE por los medios digitales, página web, tarifario físico presente en todas nuestras sucursales y por correo electrónico. Los precios varían en base a los cambios que dicte el mercado, tanto nacional como internacional y en especial a las fluctuaciones del mercado de divisas, aceptando EL CLIENTE dichas modificaciones como buenas y válidas.\r\n<br />5.5. EL CLIENTE, hace de su conocimiento y compromete a EPS a realizar por su cuenta y en nombre de EL CLIENTE todas las diligencias aduanales dominicanas y los gastos que esta genere en territorio dominicano. EL CLIENTE reembolsará a EPS, previa presentación de factura, el pago de ésta al momento de retirar sus paquetes y se obliga a pagar los impuestos correspondientes a los paquetes que sobrepasen US$200.00 (doscientos dólares americanos) con valor, costo y tarifa de flete, para que aduanas pueda liberar el paquete y enviarlos a la tienda para ser retirados por EL CLIENTE.\r\n<br />5.6. El CLIENTE, a los fines de realizar los pagos por los servicios utilizados, podrá elegir entre las siguientes modalidades de pago:\r\n</p><br />\r\n\r\n \r\n\r\n<p class="text-justify">\r\n\r\n<strong>a)    Crédito:</strong> En el caso en que EPS le haya otorgado crédito a EL CLIENTE, este deberá pagar a EPS por cualquier medio de pago (cheque, transferencia bancaria, efectivo, tarjeta de crédito) las sumas adeudadas por los servicios prestados mediante este contrato, o cualquier otro valor que le sea facturado, dentro de los treinta (30) días contados a partir de la fecha de facturación. Pasados los 30 días a partir de la fecha de facturación no se permiten pagos con tarjetas de crédito.<br />\r\n\r\nPárrafo: En caso del no cumplimiento de la obligación de pago por parte de EL CLIENTE, en la forma y plazo indicados precedentemente, EPS cargará un 5% mensual sobre el capital adeudado por concepto de mora, más los gastos legales generados en caso de iniciarse un proceso de cobro compulsivo con EL CLIENTE, previa notificación de factura.<br />\r\n\r\n<strong>b)    Contado:</strong> EL CLIENTE se compromete a pagar en efectivo o con tarjeta de crédito a EPS al momento de recibir los bienes transportados o recibir el servicio solicitado.\r\n\r\n</p><br />\r\n\r\n \r\n\r\n<p class="text-justify">\r\n\r\n<strong>Artículo sexto. Obligaciones de la empresa:</strong><br />\r\n\r\na)            EPS se compromete a entregar los envíos en las mismas condiciones de conservación en las que hayan sido recibidos en los almacenes de Miami.<br />\r\n<br />\r\nb)            EPS garantiza el envío de la correspondencia y paquetería hacia República Dominicana desde los Estados Unidos, siempre y cuando dichos envíos cumplan con los requisitos legales y aduaneros de las autoridades, tanto dominicanas como norteamericanas, detallados en el punto 8.10 de este contrato.<br />\r\n<br />\r\nc)            El plazo de entrega del paquete contratado mediante el servicio courrier en Santo Domingo, R.D., es de 24 a 72 horas laborables para los paquetes, contados a partir del arribo del mismo a Miami, USA. Dicho plazo puede variar de acuerdo a las limitaciones, causas de fuerza mayor o situaciones de caso fortuito.\r\n\r\n</p><br />\r\n\r\n<p class="text-justify"><strong>Artículo séptimo. Obligaciones del cliente consumidor:</strong><br />\r\n\r\na)            Tener capacidad legal para contratar y ser mayor de 18 años de edad. <br />\r\nb)            Revisar sus mercancías al momento de entrega. <br />\r\nc)            Pagar por las mercancías transportadas y entregadas al momento de su recepción y verificación.<br />\r\nd)            Proporcionar datos completos, exactos y suficientes del envió para ubicar el domicilio del destinatario.<br />\r\ne)            Aceptar los medios de pago (efectivo, transferencia o tarjeta de crédito) establecidos para los productos y servicios.<br />\r\nf)             Pagar el seguro que se cobra a los paquetes que sobrepasen los doscientos dólares americanos con 00/100 (US$200.00) y de no pagarlos, asumir la responsabilidad del envío descargando de esta forma a EPS.<br />\r\ng)            Respetar y aceptar todas las condiciones aquí establecidas.<br />\r\nh)            tendrá la obligación de comunicar cualquier hecho que haya producido un uso indebido de la membresía, información, robo, extravío o acceso no autorizado de su cuenta.\r\n</p><br />\r\n\r\n<p class="text-justify"><strong>Artículo octavo. Responsabilidades:</strong><br />\r\n\r\n8.1. Ningún empleado de EPS o persona alguna está autorizada para modificar los términos, condiciones y convenios en este instrumento, ni para hacer ofrecimientos en nombre de EPS. <br />\r\n<br />\r\n8.2. Es plena responsabilidad de EL CLIENTE que tanto él como su remitente cumplan en todo momento con las regulaciones actuales y leyes aplicables detallados en el punto 8.10. Los recibos y envíos están sujetos a inspección, retención verificativa, pago de los impuestos correspondientes a la salida o entrada al territorio dominicano o norteamericano. EL CLIENTE se compromete al pago inmediato de dichos impuestos y derechos según las leyes aplicables, bajo presentación de factura.<br />\r\n<br />\r\n8.3. Las partes acuerdan que este contrato y el servicio de transporte que brinda EPS están regidos por las normas de servicio Courier y las del código postal internacional, las leyes de aduanas, las leyes sanitarias y cualesquiera otras de los países a los cuales EPS tenga acceso en sus servicios y las partes acogen haciendo suyas todas las disposiciones contenidas en las mismas. A continuación, como parte integral del presente contrato, ponemos a disposición del CLIENTE los links con la finalidad de que puedan observar y respetar las normas antes indicadas: <br />\r\n1.https://www.aduanas.gob.do/media/9805/norma-general-01-2018-sobre-envios-couriers-con-finalidad-comercial.pdf <br />\r\n2.https://www.aduanas.gob.do/media/2182/3489_ley_general_de_aduanas.pdf <br />\r\n3.https://www.aduanas.gob.do/media/2229/402-05_que_aprueba_reglamento_despacho_expreso.pdf <br />\r\n4.http://www.upu.int/en/the-upu/the-upu.htmlhttp://apw.cancilleria.gov.co/tratados/AdjuntosTratados/92f4b_UPU%20-%20CONV%20Y%20PROT%20FINAL%202008.pdf <br />\r\n5.https://es.usps.com/ship/shipping-restrictions.htm <br />  \r\n\r\n8.4. EL CLIENTE, autoriza que sus paquetes sean inspeccionados, revisados y abiertos de acuerdo a las regulaciones y normas del TSA (Transportation Security Administration) entidad que regula la carga aérea en los Estados Unidos.<br />\r\n<br />\r\n8.5. EL CLIENTE, se hace responsable de que los documentos requeridos para la importación o exportación sean veraces, tales como la factura comercial, las licencias, los certificados y permisos y otros; por lo que EL CLIENTE libera a EPS de toda responsabilidad, en lo referente a la importación y desaduanización de la mercancía frente a cualquier alteración de la declaración de importación o exportación, ocultamiento de mercancías en contenedores y paquetes, pago incorrecto o tardío de impuestos, etc. ante las autoridades correspondientes.   EPS solo el gestor de la importación propiedad del CLIENTE mas no es importador y por lo tanto está limitado a tramitar a las autoridades competentes las informaciones remitidas por el cliente. <br />\r\n<br />\r\n8.6. EPS es una empresa transportista contratada por el consumidor final del producto; de esta manera, no forma parte de la cadena de comercialización, -fabricación, producción o distribución- de dicho producto al no ser contratada por su vendedor, fabricante o distribuidor, por no tener ningún contacto ni interés en el producto. En consecuencia, solo está ligada al producto por el contrato de afiliación con el CLIENTE o su consumidor final que adquirió dicho producto, para un servicio exclusivo de transporte courier.<br />\r\n<br />\r\n8.7. Conforme al artículo anterior, EPS no está obligada a responder por las tardanzas y faltas de entrega del transportista elegido por el cliente y su vendedor al momento de la venta del producto; en razón de que no tiene ningún interés en la comercialización de dicho producto y no forma parte de la distribución del mismo. <br />\r\n<br />\r\n8.8. EPS con arreglo al artículo 8.6. en lo que concierne a que solo está ligada al producto a través del contrato celebrado con su consumidor final, no responderá por los desperfectos técnicos, mecánicos, eléctricos, magnéticos, electrónicos o de cualquier naturaleza que pudieran presentar los bienes transportados; los cuales deben ser reclamados al vendedor del producto. Tampoco responderá por los retrasos, faltas de entrega, errores, entre otros, causados por la empresa transportista elegida al momento de la compraventa del producto vía internet, por el cliente y el  vendedor del producto. Es el vendedor del producto y la empresa transportista elegida por el vendedor y el cliente al momento de la venta del artículo, quienes deben responder por sus retrasos y faltas de entrega.<br />\r\n<br />\r\n8.9. Queda entendido entre las partes que en el servicio contratado por EL CLIENTE queda totalmente prohibido el envío o recibo de Money Orders, Travel Checks, Dinero en Efectivo, Artículos Perecederos, Bebidas Alcohólicas, vidrios, Animales Vivos o Pieles de Animales, Productos en Spray, CO2, Semillas - Plantas – Madera; Explosivos, Combustibles y Corrosivos; Armas de Fuego, Balas o Municiones, Medicinas, Drogas y Estupefacientes; Cualquier artículo cuyo primer ingrediente sea Alcohol, Soluciones de Limpieza, Fuegos Artificiales y Pólvora, Gas, Gas Lacrimógeno y Gas Pimienta, Encendedores o Fósforos, Baterías que contengan productos químicos, Veneno, Envases a Presión, Herramientas a base de Gas, Pasaportes, Material Pornográfico, Joyas, Bolsas de Aire (Air Bag) o vidrio; los cuales están sujetos a regulación por la Asociación Internacional de Transporte Aéreo (IATA), la Organización Internacional de Aviación Civil (ICAO) y por el Código Federal de Regulaciones de los Estados Unidos de Norteamérica, Titulo No.9. En consecuencia, EPS no responderá en caso de pérdida o deterioro de estos bienes, asumiendo EL CLIENTE los perjuicios que esto le cause y los que eventualmente pudieren ser causados a cualquier tercero, así como también cualquier responsabilidad de orden civil, comercial, penal o tributario, que pudieren sobrevenir en la República Dominicana y en el extranjero, cuando estos paquetes no puedan ser transportados.<br />\r\n<br />\r\n8.10. EL CLIENTE asume todas las consecuencias legales, penales, civiles y de otro orden que pudieran derivarse del manejo y transporte de cargas, paquetes y documentos prohibidos, obligándose EL CLIENTE a responder ante las autoridades competentes como propietario del artículo prohibido, así mismo autoriza a EPS a consultar la información del cliente que pueda ser requerida con fines de control y protección de la ley de lavado de activos.<br />\r\n<br />\r\n8.11. EL CLIENTE entiende y acepta que EPS podrá negarse a transportar hasta o desde territorio extranjero cualquier tipo de efecto material o producto que a su solo juicio no sea aceptado conforme a los incluidos dentro del artículo 8.10 del presente título, tanto por las autoridades dominicanas como por las de cualquier otro país del mundo donde EPS haga contacto.\r\n<br />\r\n8.12. Asimismo, EPS revisará las correspondencias, paquetes y bultos que reciba en sus oficinas locales o en el extranjero que sean entregadas por EL CLIENTE o su representante o que venga a nombre de este, especialmente aquellas que son consideradas como Artículos Prohibidos o Restringidos y que están en un listado publicado en nuestra página WEB.\r\n<br />\r\n8.13. EPS no responderá por pérdidas o deterioros ocurridos como consecuencia de embalajes inadecuados, destrucciones o retrasos en la entrega, producidos como consecuencia de casos fortuitos o fuerza mayor, tales como condiciones climáticas adversas, terremotos, inundaciones, cambios en los itinerarios de las líneas de transporte, derrumbes, actos terroristas, huelgas, pandemias y cierres de aeropuertos, limitaciones o prohibiciones en los vuelos.\r\n<br />\r\n8.14. En los casos en que, por error imputable al remitente, ya sea por proveer una dirección equívoca, datos erróneos u omisión de los mismos, la correspondencia, paquetes y bultos no llegaren a su destinatario, EL CLIENTE deberá asumir el costo por el reenvío de dicha correspondencia o paquete.\r\n<br />\r\n8.15. EPS detendrá cualquier mercancía que se sospeche o se identifique que fue adquirida mediante una transacción fraudulenta o ilegal. La información obtenida en estos casos es provista a las autoridades locales e internacionales que monitorean y combaten el fraude en-línea.\r\n\r\n</p><br />\r\n\r\n<p class="text-justify"><strong>Artículo noveno. Reclamaciones:</strong><br />\r\n9.1. EL CLIENTE deberá revisar su paquete antes de salir de las instalaciones de EPS. No será aceptada ninguna reclamación, luego del vencimiento del plazo de veinticuatro (24) horas a partir de la recepción del paquete. En el caso de las entregas a domicilio los plazos para reclamar son cuarenta y ocho (48) horas contadas a partir de la recepción del paquete.<br />\r\n9.2. En caso de existir irregularidad con el paquete (mercancía llegó incompleta, averiada, diferencia en el peso, casillero equivocado, empaque vacío) EL CLIENTE procederá a llenar un formulario de reclamación en las oficinas de EPS y anexará copia de la factura pagada en EPS, factura de compra del artículo igual a la declarada en la Dirección General de Aduanas (DGA), acompañado de la foto para validar el daño. Posteriormente EPS procesará la reclamación e investigará las condiciones en las cuales se recibió la mercancía y el empacado de la misma.  <br />\r\n9.3. Se recomienda a EL CLIENTE al momento de comprar sus productos, contratar con su vendedor web servicios Courier o servicios de entrega confirmada hacia Miami, para avalar su reclamación en caso de ocurrir cualquier inconveniente en el transporte de sus bienes desde el vendedor hacia EPS Miami. <br />\r\n9.4. Las entregas a EPS Miami por el transportista elegido por el vendedor del paquete y el cliente comprador deben ser en horas laborables y ser registrados en la puerta de EPS como acuse recibido y confirmación. Este acuse de recibo es el que servirá como prueba para avalar cualquier reclamación.<br />\r\n9.5. El peso del paquete será el registrado y pesado por EPS en Miami.<br />\r\n9.6. Con respecto a los paquetes que sean enviados por el vendedor y el cliente a EPS Miami y el cliente no reciba la notificación del arribo de dicho paquete a EPS Miami; debe este último, comunicarse con su vendedor o con la empresa elegida para el transporte del paquete hacia EPS-Miami y remitir a EPS la confirmación de la recepción de su paquete en Miami, recibido por una firma autorizada de EPS en horario laborable, para que pueda ser admisible su reclamación o en alguna otra dirección registrada por EPS en otros países del mundo.  <br />\r\n9.7. De igual manera, el cliente deberá contratar un seguro para transportar sus paquetes de vidrio, con la finalidad de garantizar su compra en caso de que estos paquetes sufran daños.<br />\r\n9.8. Las reclamaciones por defectos de productos adquiridos a través de las empresas de subastas online deberán ser realizadas al vendedor del producto de forma directa. Se recomienda que los clientes elijan vendedores confiables y seguros para adquirir a través de las empresas de subastas online leyendo toda la información del producto.\r\n</p><br />\r\n<p class="text-justify"><strong>Artículo décimo. Decomiso de paquetería:</strong><br />\r\n10.1. La correspondencia y paquetería que no sean retirados por los clientes en un período de noventa días (90) para paquetes y mercancía, y sesenta (60) días para correspondencia, catálogos y revistas, previamente notificado e informado al cliente por medio de correo electrónico; contados a partir de la recepción de dicho paquete en los almacenes de EPS, serán objeto de decomiso, y se entenderá que han sido abandonados por el cliente, por lo cual autoriza a EPS a disponer de tales correspondencias o paquetería de la forma que estime conveniente, luego de haberse realizada la notificación por correo electrónico al cliente.<br />\r\n10.2. Cada treinta (30) días, el cliente recibirá una notificación por correo electrónico de retiro de su paquete o correspondencia, en caso de no haberlo retirado de nuestras oficinas.\r\n</p><br />\r\n<p class="text-justify"><strong>Artículo décimo primero. Duración del Contrato:</strong><br />\r\n11.1. El presente contrato regirá las relaciones contractuales entre las partes.  Las modificaciones al presente contrato, luego de ser registradas y publicadas conforme a la ley General de Protección al Consumidor y Usuario No. 358-05, serán informadas a través de nuestra página web, así como también, se encontrará en línea su contenido in extenso.\r\n</p><br />\r\n\r\n<p class="text-justify"><strong>Artículo décimo segundo. Causas de Cancelación:</strong><br />\r\n12.1. En caso de que EL CLIENTE haya decidido pagar con la modalidad de crédito otorgado a través de la tarjeta de crédito, las partes acuerdan que en caso de que el banco emisor de la tarjeta de crédito, autorizada por EL CLIENTE como instrumento de pago, rechazara el pago de las sumas o valores adeudados por EL CLIENTE este contrato quedará rescindido automáticamente, previa notificación escrita de la deuda al cliente y la concesión de un periodo de gracia de diez (10) días para el pago. A falta de realizar el pago, EL CLIENTE autoriza a EPS a liquidar y disponer de todos los paquetes y bultos que se encuentren en sus almacenes para recuperar los valores adeudados.<br />\r\n12.2. EL CLIENTE que compre con tarjetas de créditos robadas, será sancionado con la cancelación de la membresía de EPS, previa notificación.\r\n</p><br />\r\n<p class="text-justify"><strong>Artículo décimo tercero. Ley aplicable: </strong><br />\r\n13.1 EL CLIENTE conviene y acepta que las relaciones surgidas mediante el presente contrato estarán sujetas a las disposiciones señaladas en el presente acuerdo.<br />\r\n13.2 No obstante, las partes acuerdan que el presente contrato será regido e interpretado por el derecho común y por la Ley No. 358-05, para todo lo que no haya sido previsto y serán dirimidos sus conflictos conforme al derecho común y las normas vigentes protectoras de ambas partes conforme sea el caso.\r\n</p><br />\r\n\r\n \r\n\r\n<p class="text-justify"><strong>Articulo décimo cuarto. Domicilio:</strong><br />\r\n\r\nLas partes, de común acuerdo, hacen elección de domicilio para todos los fines y consecuencias del mismo en las direcciones enunciadas en el encabezamiento del presente contrato. <br />\r\n\r\nHecho y firmado en dos (2) originales, uno para cada una de las partes, en la Ciudad de Santo Domingo, Capital de la República Dominicana, a los _____________ días del mes de ____________________, del año _____. <br />\r\n\r\n \r\n\r\nPor EPS                                                                      Por El Cliente<br />\r\n    ________________________                               _______________________________<br />\r\n\r\n   Sello y Firma                                                       Sello y Firma <br />                     \r\n       Nombre ___________________                                                                            Nombre ___________________<br />\r\n    </p><p class="text-center"><strong>-Contrato Registrado en Pro Consumidor bajo el No.015/2021 en fecha 01 de junio del 2021.-</strong></p>  \r\n\r\n \r\n\r\n<p></p><br />\r\n\r\n                            </div>\r\n\r\n                            </div>\r\n                                </div>\r\n                                       <div class="col-md-3 col-sm-1 col-lg-3"></div>\r\n                       </div>','advancedSearchOfLocalization':'{0} of {1}','attributePasteFilterSettings':{'list':['class'],'filterMode':'BlackList'},'enterMode':'P','templateHoverErrorFrameCloseButton':{'element':'EFCB','postfixes':[''],'imageUrls':[''],'imagePostfixes':['Img'],'className':['dxheErrorFrameCloseButtonHover_Office365'],'cssText':[''],'name':'mContrato'}},null,null,{'spellChecker':{'areDictionariesAssigned':false,'scStartOptions':{'culture':'Invariant Language (Invariant Country)','ignoreWordsWithNumber':true,'ignoreMixedCaseWords':true,'ignoreMarkupTags':true,'ignoreUrls':true,'ignoreUpperCaseWords':true,'ignoreEmails':true}},'validation':{'clientValidationEnabled':false,'validationPatterns':[],'errorText':'The HTML content is invalid','isValid':true}});

//-->


/* ---- inline #8 ---- */

//<![CDATA[

var callBackFrameUrl='/WebResource.axd?d=beToSAE3vdsL1QUQUxjWdS9uCtpHzFr3PASHXQIGjhun65JpX7OPiKSe-NHQg4Cs7R1UUUHEqeeO4cRynjfHHQ2&t=639190689332169432';
WebForm_InitCallback();//]]>
