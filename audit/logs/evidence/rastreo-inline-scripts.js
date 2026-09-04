/* ---- inline #0 ---- */


        function Confirmar(titulo, message, tipo, tituloPrint) {


            swal({
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
    

/* ---- inline #1 ---- */

//<![CDATA[
var theForm = document.forms['frmBody'];
if (!theForm) {
    theForm = document.frmBody;
}
function __doPostBack(eventTarget, eventArgument) {
    if (!theForm.onsubmit || (theForm.onsubmit() != false)) {
        theForm.__EVENTTARGET.value = eventTarget;
        theForm.__EVENTARGUMENT.value = eventArgument;
        theForm.submit();
    }
}
//]]>


/* ---- inline #2 ---- */

<!--
ASPx.AddDisabledItems('cpBody_gvDatos_DXCBtn0',[[['dxbDisabled_Office365'],[''],[''],['','TC']]]);

//-->


/* ---- inline #3 ---- */

<!--
ASPx.AddDisabledItems('cpBody_gvDatos_DXCBtn1',[[['dxbDisabled_Office365'],[''],[''],['','TC']]]);

//-->


/* ---- inline #4 ---- */

<!--
ASPx.AddDisabledItems('cpBody_gvDatos_DXCBtn2',[[['dxbDisabled_Office365'],[''],[''],['','TC']]]);

//-->


/* ---- inline #5 ---- */

<!--
ASPx.createControl(ASPxClientGridView,'cpBody_gvDatos','',{'callBack':function(arg) { WebForm_DoCallback('ctl00$cpBody$gvDatos',arg,ASPx.Callback,'cpBody_gvDatos',ASPx.CallbackError,true); },'uniqueID':'ctl00$cpBody$gvDatos','stateObject':{'keys':['/^DXN','DP01-00306834'],'callbackState':'nGdjkBZcbD6UqQhbZN9bhDLrPpghts0i/WApVeJld5a7m4J0QlpPhTDvjJoQKbCfno/1+uyKtNVV8EdN7oODq3JSMIgqHEw7ctP423cAoSyOLmcciskN9FrAoxb0gEWW/nk7QL2ePZIWABqeh1UWTB4FAVDUCAfF2PuMSrU0DEnAWqwIlFZkxWBHxVLhI6pyTg7nteB9VyWsSef2UoGfdtFVj9Wl832jPS5VM14G+8WK2QQa8H8yTu3J0Xzxi92GZNEx6jMw7clow8ULQtN4rb8UT52EUZ+eSVPvTui/7y3U+dQZpW2qfKFfCkCY7VwJvauSbLDmQhLGRKTFWT8ey0lGyzRAkBniUAR3iJ8GH4bgCzqUdG9TKvkTOweuGZTsB5ABJ6mIfgPVqNt3LZ6y+Kt8fCz5nS+JR5YNUXfDgiNLG+24BgSU7Ddw6ONKcIzy3HbPXepqdKtaKLhH4ya9+u+L6nv9XPyZ/mrfNRfk4+vwD2DiNwCP2hN9efIXw+TC91mQpilVM/eNc5wHcynfLLQYPJJ7sNijlOJJ9NS9ZOK5Dr9vSyao5YMstGzrBqlrhyc68swrdTvzs0WK6Jdp/u7mvgre32cJ2ccH1aqa3A0qQEtzjEV1X/hcrS3ZmJShoIKlzVFGXgisukNgUFlSnbw0o9oG1UtlFxAgcEJ/KCePsUfzCN2rRw1j9dq+fZMzxRAfFEV0mX0dZWAj+B7mq0syFhH+acHH3zIRHIKYC5sv3ksBoJ9zjIAc1YU9QPN/ffzyeL8034OXk8ZzpdzALPFOCofci8RFK/W1wW/xPlt5PR5UdROqxxSsd3EV91ks3Lp6K3vSA+AoyusMQt6s84WT0knXXKBCSamrDEw6JE90thQur7DdnN/FD+dC4MB9wQykuAMiwn/JN8H6hL3rESVHwG0XvdhvTOJ2ii05cBe6JjtPcdgVzc7JetAvLbAQOI2M2zX2ngf6Zex+1MGyhSrYRtpgYn8eLSvif0hFLEJuL8U3RyN6IaCgW2gorTF3gQD57rTNCoNZekvrBl9XKKMUpqDlDvJTUNi9jb0PBQtNNBml5CCn/VfSZAxOj7GrigtxrEdBqawJ4ArOCgvIjTsizqMdNyPmxf9GDw3k+4oupvq9cNiFK34nDM34Uz/SRNYuVoE6ypyc8cYPIGIfFrncWdESpCcBSBUEtXrhjqG/rFlBEy7NukajgAdQjyRRn2dfANjbXJqWlrGXIDPaY9N5FtqAek9FvbdxZGZY0gEUFR0h8m25nTWzZWJRIlKweeaOCIlM3pabgWrSTZLY309fgshXyx3lExwUkZLUP7WKuzvFT7ykn7ZG/3UXtnNWhOCIdnMUD6I11Vn3RB2GFCWKTu38u1xy94FWUn+SFAPyl/HK18ssQHCbscTdWoTNjWunxvDdqJtXpCFiXW8XemChoaR0MUjkEaCkkvr2LO8rJrm7vJkh1OjUKfw1GOqz/IFhddXzUDRdr47OzjiXzUn1AIoUfAmQbo2s7Boj07PiNEJ/ta+SDV3wJtJv3RX6F+QK1yZNFBWV+jHjtRy4O3Ux5tGK5ecBeH6mSPax9HA2hV/pq3T5mpozgCnGa6+pPMg/qAAoSJL9q6pjH7rFUN5vZ5Df9QSAxEfUFtug9hRlu05s52QjAqsWQGmvtneVxiL/+PFQsHwgiOZnFwjFmubJYiL2wG+g4SJTgvRD8kylbY5ZXR3vlkK3hCJ4iNkDKNnWitsTWxijwvnY7oy7iuca1w5Tv3caAl98BUBG/hB8HSyToyThwhrACn4RgC2hBQpWiLiM5SCtbxw0y5M5ZYuLY5iZvsrGwbnJKAQAQIfnlYi63JKb//w5+SJ6O/AlaNZwpGl58zFdQwqcmP+dEkfyN+2y7wWbhBcL4bMdtUVlNFaEPLnlYsqf1l1SYIRbAJbd47Mc6kuEUdfS7doLQrNIKI3lLpeeZZt2fDHSNu5B4230nPHD8U4q7dB9sn2XN5bENTqiImqmO8/252OP0VCOIy8IyvTGJ2KjXzwt6M/MnFHoyKfpEH2w45JNiXP2y7Jee+cXue9dv/5S+tQmYcokrjKvplliT/6vdkBd/Wq3BbeQksZfEIb9bdqjenj4StOpcqn5tiL0Xe8mEWdW10+N2vaIYsGmIL976TWkb87b3PWfmG4v1Nfy105seZxBBzSZMK3qOqyuqz0OdIxZOthSE3kmC1tKBFisslR2zsnbBeWyJRx/jXUE1tM4eRKYGBHwMbDpLRwi29vfhGEYsx0nrvuV+af0AKEQf+KXuuB25RJeO6NaGXMwp1NAQPY8/Y9Ru3d4WazGCOC//yODtl1U0/f+jqmwyhWkA2v6TssQ2WfFzDY2szaaRIAeQeDjb5Vq0i4tiIiPwn+BLNfWAsDUkmLtMnPKTWH50JDA4oXTZnIYQdP0R93Sy+THbsjo','groupLevelState':{'0':[[0,0]]},'selection':''},'callBacksEnabled':true,'pageRowCount':2,'pageRowSize':10,'pageIndex':-1,'pageCount':1,'selectedWithoutPageRowCount':0,'visibleStartIndex':0,'focusedRowIndex':-1,'allowFocusedRow':false,'allowSelectByItemClick':false,'allowSelectSingleRowOnly':false,'callbackOnFocusedRowChanged':false,'callbackOnSelectionChanged':false,'editState':0,'editItemVisibleIndex':-1,'searchPanelFilter':'','allowDelete':true,'allowEdit':true,'allowInsert':true,'columnProp':[[0,,,,0,,,,0,,1,,,0,,,,,,,,0],[1,,,'Guia',,,,,1],[2,,,'Fecha',,,,,2,,,,,,,,,,,,,2],[3,,,'Tracking',,,,,2,,,,,,,,,,,,,3],[4,0,,'RecibeNombre',,,,,3,,,,,,,,1],[5,0,,'OficinaID',,,,,3,,,,,,,,1],[6,0,,'TransaccionID',,,,,3,,,,,,,,1],[7,0,,'ClienteID',,,,,3,,,,,,,,1],[8,,,'Peso',,,,,4],[9,,,'FOB',,,,,5],[10,,,'StatusNombre',,,0,1,6,0],[11,,,'Descripcion',,,,,7],[12,,,'EnviaNombre',,,,,8],[13,,,'Retenido',,,,,9],[14,,,'ServicioNombre',,,,,10],[15,,,'TotalAPagar',,,,,11],[16,,,'Adjuntos',,,,,0,,,,,,,,,,,,,16]],'shouldScrollToNewRow':false,'editMode':2,'indentColumnCount':1,'allowChangeColumnHierarchy':false,'allowMultiColumnAutoFilter':false,'adaptiveButtonPos':2,'adaptiveColumnsOrder':[15,14,13,12,11,10,9,8,3,2,1,16,0]},null,null,{'adaptiveModeInfo':{'adaptivityMode':1,'hideDataCellsWindowInnerWidth':0,'adaptiveDetailColumnCount':1,'allowTextTruncationInAdaptiveMode':[false,false,false,false,false,false,false,false,false,false,false,false,false],'allowHideDataCellsByColumnMinWidth':false,'allowOnlyOneAdaptiveDetailExpanded':false}});
ASPxClientGridBase.PostponeInitialize('cpBody_gvDatos',({'commandButtonIDs':['cpBody_gvDatos_DXCBtn0','cpBody_gvDatos_DXCBtn1','cpBody_gvDatos_DXCBtn2'],'styleInfo':{'ei':'<tr class="dxgvEditingErrorRow_Office365">\r\n\t<td class="dxgvIndentCell dxgv" style="width:0px;border-left-width:0px;">&nbsp;</td><td class="dxgv dxgRRB" data-colSpan="12"></td><td class="dxgvAIC dxgv dxgRRB" style="border-left-width:0px;">&nbsp;</td>\r\n</tr>','fc':{'className':'dxgvFocusedCell_Office365'},'bec':{'className':'dxgvBatchEditCell_Office365 dxgv'},'bemc':{'className':'dxgvBatchEditModifiedCell_Office365 dxgv'},'bemergmc':{'className':'dxgvBatchEditModifiedCell_Office365 dxgvBatchEditCell_Office365 dxgv'},'bedi':{'className':'dxgvBatchEditDeletedItem_Office365 dxgv'},'sel':{'className':'dxgvSelectedRow_Office365'},'fi':{'className':'dxgvFocusedRow_Office365'},'fgi':{'cssText':'text-align:Left;vertical-align:Middle;color:Black;background-color:WhiteSmoke;font-size:Medium;font-weight:bold;','className':'dxgvFocusedGroupRow_Office365 left dx-wrap'},'beni':{'className':'dxgvBatchEditNewItem_Office365 dxgv'}}}));

//-->


/* ---- inline #6 ---- */

<!--
ASPx.createControl(ASPxClientGridView,'cpBody_ppCambioGuia_gvDetalles','gvDatos',{'callBack':function(arg) { WebForm_DoCallback('ctl00$cpBody$ppCambioGuia$gvDetalles',arg,ASPx.Callback,'cpBody_ppCambioGuia_gvDetalles',ASPx.CallbackError,true); },'enableCallbackAnimation':true,'enableSlideCallbackAnimation':true,'enableSwipeGestures':true,'uniqueID':'ctl00$cpBody$ppCambioGuia$gvDetalles','stateObject':{'keys':[],'callbackState':'fu77szrqLvq1COAjEC14XoFbTg32e/71MW53dsXON9HZ21QXLR6TUOuaGx0jokmMhULO0sW81S58KnYTQQKPC8hMr7QinHVWh2dXSkiHcEWhSiv8b77b5gVMYhIJuyf9MWGb9HP8oACEEUkiQK3Pt1sRKnEfDwKZRL8r71HJDBn0yv1th46rnQZBWroWZOrXj9AqNjUCcp3BNUQ8hsylsGY57yWk+/uOdrj10nkz0cp4YFy1v2BSwUhrhKCIO1tm8QCFkn7SeqDsE6TBcdDjelfz67RdAWWl5tBeb2ql/OdS98q7v6d5nlMQUAlQJkZDtAISY1AzEvE7c791w2374n8XNmvt84AIjf5rhfiGZCgRvNqe+rxKpy1LD4XQUEydUQ5UzeXOfNkOSMTlhOnizcVMuhflHUA8baAO5iQwv1cOMn+Q+x4Y5yTvfmtRUe7AzAyyALUTiMVsyWk9qVl8bQHSBpl8Y0guGPDKDuAlHj5JnW0+X6o+gc17g4fIJ45OsqRq+h4iTdAfmK+CSgbjH/GlpezgfwTQWxQcOE56n/SYwgY6Fr51snVkAU+4cuZF','groupLevelState':{},'selection':''},'callBacksEnabled':true,'pageRowCount':0,'pageRowSize':10,'pageIndex':-1,'pageCount':0,'selectedWithoutPageRowCount':0,'visibleStartIndex':0,'focusedRowIndex':-1,'allowFocusedRow':false,'allowSelectByItemClick':false,'allowSelectSingleRowOnly':false,'callbackOnFocusedRowChanged':false,'callbackOnSelectionChanged':false,'editState':0,'editItemVisibleIndex':-1,'searchPanelFilter':'','allowDelete':true,'allowEdit':true,'allowInsert':true,'columnProp':[[0,,,'Guia',,,0,1,0,0],[1,0,,'PaqueteNo',,,,,1,,,,,,,,1],[2,,,'Tracking',,,,,1],[3,0,,'AgregadoPor',,,,,9,,,,,,,,1],[4,,'estatus','estatus',,,,,2],[5,0,'estatus','Comentario',,,,,5,,,,,,,,1],[6,0,'TransaccionPadreID','TransaccionPadreID',,,,,5,,,,,,,,1],[7,,,'StatusFecha',,3,,,4]],'shouldScrollToNewRow':false,'editMode':2,'indentColumnCount':1,'allowChangeColumnHierarchy':false,'allowMultiColumnAutoFilter':false,'adaptiveButtonPos':2,'adaptiveColumnsOrder':[7,4,2,0]},null,null,{'adaptiveModeInfo':{'adaptivityMode':1,'hideDataCellsWindowInnerWidth':0,'adaptiveDetailColumnCount':1,'allowTextTruncationInAdaptiveMode':[false,false,false,false],'allowHideDataCellsByColumnMinWidth':false,'allowOnlyOneAdaptiveDetailExpanded':false}});
ASPxClientGridBase.PostponeInitialize('cpBody_ppCambioGuia_gvDetalles',({'commandButtonIDs':[],'styleInfo':{'ei':'<tr class="dxgvEditingErrorRow_Office365">\r\n\t<td class="dxgvIndentCell dxgv" style="width:0px;border-left-width:0px;">&nbsp;</td><td class="dxgv dxgRRB" data-colSpan="3"></td><td class="dxgvAIC dxgv dxgRRB" style="border-left-width:0px;">&nbsp;</td>\r\n</tr>','fc':{'className':'dxgvFocusedCell_Office365'},'bec':{'className':'dxgvBatchEditCell_Office365 dxgv'},'bemc':{'className':'dxgvBatchEditModifiedCell_Office365 dxgv'},'bemergmc':{'className':'dxgvBatchEditModifiedCell_Office365 dxgvBatchEditCell_Office365 dxgv'},'bedi':{'className':'dxgvBatchEditDeletedItem_Office365 dxgv'},'sel':{'className':'dxgvSelectedRow_Office365'},'fi':{'className':'dxgvFocusedRow_Office365'},'fgi':{'className':'dxgvFocusedGroupRow_Office365'},'beni':{'className':'dxgvBatchEditNewItem_Office365 dxgv'}}}));

//-->


/* ---- inline #7 ---- */

<!--
ASPx.AddHoverItems('cpBody_ppCambioGuia',[[['dxpc-closeBtnHover'],[''],['HCB-1']]]);
ASPx.createControl(ASPxClientPopupControl,'cpBody_ppCambioGuia','ppCambioGuia',{'callBack':function(arg) { WebForm_DoCallback('ctl00$cpBody$ppCambioGuia',arg,ASPx.Callback,'cpBody_ppCambioGuia',ASPx.CallbackError,true); },'enableCallbackAnimation':true,'uniqueID':'ctl00$cpBody$ppCambioGuia','popupAnimationType':'fade','closeAnimationType':'fade','closeAction':'CloseButton','closeOnEscape':true,'popupHorizontalAlign':'WindowCenter','popupVerticalAlign':'WindowCenter','isPopupPositionCorrectionOn':false,'allowDragging':true,'modal':true,'width':1000,'widthFromServer':true,'height':600,'autoUpdatePosition':true,'contentOverflowX':'Auto','contentOverflowY':'Auto'});

//-->


/* ---- inline #8 ---- */

                function Filtro() {
                    document.getElementById("cpBody_bFiltro").click();
                }
                function VerGuia(s) {
                    document.getElementById("cpBody_Guia").value = s;
                    document.getElementById("cpBody_bPaquetes").click();
                }


                function GetPaquetesCan() {
                    var TokenID = document.getElementById("cpBody_TokenID").value;
                    var ClienteID = document.getElementById("cpBody_Guia").value;

                    $.ajax({
                        type: "Post",
                        url: "WebService1.asmx/GetPaquetesCan",
                        dataType: "Text",
                        ContentType: "text/html; charset=utf-8",
                        data: "TokenID=" + TokenID + "&Codigo=" + ClienteID,

                        success: function (data) {
                            document.getElementById("cpBody_lCantidadPaquetes").innerText = data;
                        },
                        error: function (err) {
                            alert(err);
                        }
                    })
                }



                function GetEstatus() {
                    var TokenID = document.getElementById("cpBody_TokenID").value;
                    var ClienteID = document.getElementById("cpBody_Guia").value;

                    $.ajax({
                        type: "Post",
                        url: "WebService1.asmx/GetEstatus",
                        dataType: "Text",
                        ContentType: "text/html; charset=utf-8",
                        data: "TokenID=" + TokenID + "&Codigo=" + ClienteID,

                        success: function (data) {
                            $('#EstatusPaquetes').DataTable({
                                "destroy": true,
                                "aaData": JSON.parse(data),


                                "order": [[0, 'asc']],


                                "responsive": true,
                                "columns": [{
                                    "mDataProp": "Guia"


                                },
                                { "mDataProp": "PaqueteNo" },
                                {

                                    "mDataProp": "StatusFecha",
                                    "type": "datetime "

                                },
                                { "mDataProp": "Referencia" }, { "mDataProp": "Tracking" }, {

                                    "mDataProp": "estatus"
                                }, { "mDataProp": "Comentario" }],

                            });
                        },
                        error: function (err) {
                            alert(err);
                        }
                    })
                }

            

/* ---- inline #9 ---- */

//<![CDATA[

var callBackFrameUrl='/WebResource.axd?d=beToSAE3vdsL1QUQUxjWdS9uCtpHzFr3PASHXQIGjhun65JpX7OPiKSe-NHQg4Cs7R1UUUHEqeeO4cRynjfHHQ2&t=639190689332169432';
WebForm_InitCallback();//]]>
