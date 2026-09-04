/* ---- inline #0 ---- */

        function login() {
            document.getElementById("blogin").click();
        }
        function Recuperar() {
            document.getElementById("bRecuperar").click();
        }


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
    