// import { Context } from "../Context/Context";
// import { ChannelMonitor } from "../Channel/ChannelMonitor";

// let context = new Context({EPICS_CA_BEACON_PERIOD: "5"});

// async function tcaMonitor(name: string) {
//     let channel = await context.createChannel(name);
//     let monitor = await channel?.createMonitor(monitorListener, 17);
// }

// function monitorListener(monitor: ChannelMonitor) {
//     // console.log(monitor.name, ":", monitor.getChannel().getDbrValue());
// }

// // context.initialize().then(() => {
// //     // tcaMonitor("FE:Scope_1:RMS2");
// //     tcaMonitor("val1");
// // });

// setTimeout(() => {
//     // console.log("Terminate program");
//     // context.terminate();
//     // const channel = context.getChannelByName("val1");
//     // channel?.destroyHard();
//     context.destroyHard();
// }, 3 * 1000)


// // import { Context, ChannelMonitor } from "..";
// // import { parentPort, workerData } from "worker_threads";

// // let timeA = -1000000;

// // const npv = 30000;
// // let npvIdx = npv;

// // let allData: Record<string, any> = {}
// // let context = new Context();

// // console.log("----------------", npv)

// // async function tcaMonitor(name: string) {
// //     let channel = await context.createChannel(name);
// //     let monitor = await channel?.createMonitor(addData);
// //     await monitor?.subscribe();
// //     npvIdx = npvIdx - 1;
// //     if (npvIdx === 1) {
// //         console.log(name, performance.now() - timeA);
// //     }
// // }

// // function addData(monitor: ChannelMonitor) {
// //     allData[monitor?.name] = monitor.data;
// // }

// // function sendAllData(allData: Record<string, any>) {
// //     // parentPort?.postMessage(allData);
// //     // console.log(Object.keys(allData).length)
// //     console.log(allData)
// // }

// // context.initialize().then(() => {
// //     for (let ii = 0; ii < 100; ii++) {
// //         const name = "valabc" + ii.toString();
// //         tcaMonitor(name);
// //     }
// // });

// // let pvList1 = [
// // 'CCL:Summary',
// // 'CCL_Cool:Summary:Alarm.SEVR',
// // 'CCL_HPRF:CO21:CmdRunCF',
// // 'CCL_HPRF:CO21:CmdRunCN',
// // 'CCL_HPRF:CO21:CmdRunI',
// // 'CCL_HPRF:CO21:CmdRunL',
// // 'CCL_HPRF:CO21:Pres_Sw_Ctl',
// // 'CCL_HPRF:CO22:CmdRunCF',
// // 'CCL_HPRF:CO22:CmdRunCN',
// // 'CCL_HPRF:CO22:CmdRunI',
// // 'CCL_HPRF:CO22:CmdRunL',
// // 'CCL_HPRF:CO22:Pres_Sw_Ctl',
// // 'CCL_HPRF:CO23:CmdRunCF',
// // 'CCL_HPRF:CO23:CmdRunCN',
// // 'CCL_HPRF:CO23:CmdRunI',
// // 'CCL_HPRF:CO23:CmdRunL',
// // 'CCL_HPRF:CO23:Pres_Sw_Ctl',
// // 'CCL_HPRF:CO24:CmdRunCF',
// // 'CCL_HPRF:CO24:CmdRunCN',
// // 'CCL_HPRF:CO24:CmdRunI',
// // 'CCL_HPRF:CO24:CmdRunL',
// // 'CCL_HPRF:CO24:Pres_Sw_Ctl',
// // 'CCL_HPRF:IGBT1:PPS_WP_SPR2_Flt',
// // 'CCL_HPRF:IGBT2:PPS_WP_SPR2_Flt',
// // 'CCL_HPRF:IGBT3:PPS_WP_SPR2_Flt',
// // 'CCL_HPRF:IGBT4:PPS_WP_SPR2_Flt',
// // 'CCL_MPS:BS:Ilk_Latch',
// // 'CCL_MPS:BS:Ilk_Reset',
// // 'CCL_Mag:Summary_Mag.SEVR',
// // 'CCL_RF:Summary.SEVR',
// // 'CCL_Vac:Summary.SEVR',
// // 'CF_CU:AIT_CU001:EpicsCommAlarm',
// // 'CF_CU:AIT_CU001:TAAVG1M_F',
// // 'CF_CU:HW_TT4015:T',
// // 'CHL:Summary_All:StsCur',
// // 'CHL:Summary_All:StsNOK',
// // 'CoolingWater:Sum',
// // 'DTL:Summary',
// // 'DTL_Cool:Summary:Alarm.SEVR',
// // 'DTL_HPRF:CO23:CmdRunCF',
// // 'DTL_HPRF:CO23:CmdRunCN',
// // 'DTL_HPRF:CO23:CmdRunI',
// // 'DTL_HPRF:CO23:CmdRunL',
// // 'DTL_HPRF:CO23:Pres_Sw_Ctl',
// // 'DTL_HPRF:CO25:CmdRunCF',
// // 'DTL_HPRF:CO25:CmdRunCN',
// // 'DTL_HPRF:CO25:CmdRunI',
// // 'DTL_HPRF:CO25:CmdRunL',
// // 'DTL_HPRF:CO25:Pres_Sw_Ctl',
// // 'DTL_HPRF:IGBT3:PPS_WP_SPR2_Flt',
// // 'DTL_HPRF:IGBT5:PPS_WP_SPR2_Flt',
// // 'DTL_Mag:Summary.SEVR',
// // 'DTL_RF:LLRFOK.SEVR',
// // 'DTL_Vac:Summary.SEVR',
// // 'EDmp:Summary',
// // 'Elec:Summary_Pwr:Alarm',
// // 'FE:Summary',
// // 'FE_LEBT:CHOP:ConnectSts',
// // 'FE_LEBT:CHOP:Connect_cmd',
// // 'FE_LEBT:CHOP:DisConnect_cmd',
// // 'FE_MPS:MIOC1A:status_sum',
// // 'HEBT:Summary',
// // 'HEBTInj:Summary',
// // 'HEBTInj_Mag:Sum.SEVR',
// // 'HEBTInj_Vac:Sum.SEVR',
// // 'HEBT_Cool:Sum.SEVR',
// // 'HEBT_MDmp:Summary:Alarm',
// // 'HEBT_Mag:Summary.SEVR',
// // 'HEBT_Vac:Summary.SEVR',
// // 'ICS:Rampup:cur_state',
// // 'ICS:Rampup:hold_1Hz',
// // 'ICS:Rampup:info',
// // 'ICS:Summary_HBt:DisSum',
// // 'ICS:Summary_HBt:StsLch',
// // 'ICS_MPS:CBd_PPS:Rst',
// // 'ICS_MPS:CBd_PPS:Sts',
// // 'ICS_MPS:CBd_PPS:Sts.RVAL',
// // 'ICS_MPS:PLC_Sum1',
// // 'ICS_MPS:PS_65KV:CmdOn',
// // 'ICS_MPS:PS_FE65KV:Sts',
// // 'ICS_MPS:PS_Lens2:Ilk_Reset',
// // 'ICS_MPS:PS_Lens2:Ilk_Sts',
// // 'ICS_MPS:PS_RFQHV:CmdOn',
// // 'ICS_MPS:PS_RFQHV:IlkEcho',
// // 'ICS_Opr:CUB:Sum',
// // 'ICS_Opr:ErrBeam:AlrmSum',
// // 'ICS_Opr:NPBeamSet:Alarm',
// // 'ICS_Opr:Tgt:Sum',
// // 'ICS_Opr:TripCompare:TripTimeString',
// // 'ICS_Opr:TripCompare:info',
// // 'ICS_Tim:Chop_Flavor1:OnPulseWidth',
// // 'ICS_Tim:Gate_BeamOn:Lockout',
// // 'ICS_Tim:Gate_BeamOn:RR',
// // 'ICS_Tim:Gate_BeamOn:SSMode',
// // 'ICS_Tim:Gate_BeamOn:SSTrigger',
// // 'ICS_Tim:Gate_BeamOn:Switch',
// // 'ICS_Tim:MPS_Mode:BeamMode',
// // 'ICS_Tim:MPS_Mode:MachMode',
// // 'ID_DIWS:Summary:Alarm',
// // 'IDmp:Summary',
// // 'IDmp_Diag:BCM01:Q',
// // 'IDmp_Mag:Sum.SEVR',
// // 'IDmp_Vac:Sum.SEVR',
// // 'IS:Summary_Ovr.SEVR',
// // 'LDmp:Summary',
// // 'LEBT_Chop:MPS1:FPAR_MEBT_BS_chan_status',
// // 'MEBT:Summary_Ovr.SEVR',
// // 'RFQ:Summary.SEVR',
// // 'RFQ_HPRF:CO21:CmdRunCF',
// // 'RFQ_HPRF:CO21:CmdRunCN',
// // 'RFQ_HPRF:CO21:CmdRunI',
// // 'RFQ_HPRF:CO21:CmdRunL',
// // 'RFQ_HPRF:CO21:Pres_Sw_Ctl',
// // 'RFQ_HPRF:IGBT1:PPS_WP_SPR2_Flt',
// // 'RTBT:Summary',
// // 'RTBT_Cool:Sum.SEVR',
// // 'RTBT_Diag:BCM25I:Power1',
// // 'RTBT_Diag:BCM25I:Power1_KW',
// // 'RTBT_Diag:BCM25I:Power1_MW',
// // 'RTBT_Mag:Sum.SEVR',
// // 'RTBT_Vac:Sum.SEVR',
// // 'Ring:Summary',
// // 'Ring_Cool:Sum.SEVR',
// // 'Ring_LLRF:Cav:Field_Amp_OK.SEVR',
// // 'Ring_Mag:EKick_Sum.SEVR',
// // 'Ring_Mag:IKick_Sum.SEVR',
// // 'Ring_Mag:Sum.SEVR',
// // 'Ring_Vac:Sum.SEVR',
// // 'SCL:12_18_HBOK:Sum',
// // 'SCL:19_23_HBOK:Sum',
// // 'SCL:Drift_HBOK:Sum',
// // 'SCL:MBOK:Sum',
// // 'SCL_Cryo:Cryo_12_18_HBOK:Sum.SEVR',
// // 'SCL_Cryo:Cryo_19_23_HBOK:Sum.SEVR',
// // 'SCL_Cryo:Cryo_MBOK:Sum.SEVR',
// // 'SCL_DIWS:Summary_KL2:Alarm.SEVR',
// // 'SCL_DIWS:Summary_KL3:Alarm.SEVR',
// // 'SCL_Diag:LW_On:Sum',
// // 'SCL_HPRF:CO201:CmdRunCF',
// // 'SCL_HPRF:CO201:CmdRunCN',
// // 'SCL_HPRF:CO201:CmdRunI',
// // 'SCL_HPRF:CO201:CmdRunL',
// // 'SCL_HPRF:CO201:Pres_Sw_Ctl',
// // 'SCL_HPRF:CO205:CmdRunCF',
// // 'SCL_HPRF:CO205:CmdRunCN',
// // 'SCL_HPRF:CO205:CmdRunI',
// // 'SCL_HPRF:CO205:CmdRunL',
// // 'SCL_HPRF:CO205:Pres_Sw_Ctl',
// // 'SCL_HPRF:CO209:CmdRunCF',
// // 'SCL_HPRF:CO209:CmdRunCN',
// // 'SCL_HPRF:CO209:CmdRunI',
// // 'SCL_HPRF:CO209:CmdRunL',
// // 'SCL_HPRF:CO209:Pres_Sw_Ctl',
// // 'SCL_HPRF:CO212:CmdRunCF',
// // 'SCL_HPRF:CO212:CmdRunCN',
// // 'SCL_HPRF:CO212:CmdRunI',
// // 'SCL_HPRF:CO212:CmdRunL',
// // 'SCL_HPRF:CO212:Pres_Sw_Ctl',
// // 'SCL_HPRF:CO214:CmdRunCF',
// // 'SCL_HPRF:CO214:CmdRunCN',
// // 'SCL_HPRF:CO214:CmdRunI',
// // 'SCL_HPRF:CO214:CmdRunL',
// // 'SCL_HPRF:CO214:Pres_Sw_Ctl',
// // 'SCL_HPRF:CO215:CmdRunCF',
// // 'SCL_HPRF:CO215:CmdRunCN',
// // 'SCL_HPRF:CO215:CmdRunI',
// // 'SCL_HPRF:CO215:CmdRunL',
// // 'SCL_HPRF:CO215:Pres_Sw_Ctl',
// // 'SCL_HPRF:CO218:CmdRunCF',
// // 'SCL_HPRF:CO218:CmdRunCN',
// // 'SCL_HPRF:CO218:CmdRunI',
// // 'SCL_HPRF:CO218:CmdRunL',
// // 'SCL_HPRF:CO218:Pres_Sw_Ctl',
// // 'SCL_HPRF:CO221:CmdRunCF',
// // 'SCL_HPRF:CO221:CmdRunCN',
// // 'SCL_HPRF:CO221:CmdRunI',
// // 'SCL_HPRF:CO221:CmdRunL',
// // 'SCL_HPRF:CO221:Pres_Sw_Ctl',
// // 'SCL_HPRF:IGBT01:PPS_WP_SPR2_Flt',
// // 'SCL_HPRF:IGBT05:PPS_WP_SPR2_Flt',
// // 'SCL_HPRF:IGBT09:PPS_WP_SPR2_Flt',
// // 'SCL_HPRF:IGBT12:PPS_WP_SPR2_Flt',
// // 'SCL_HPRF:IGBT14:PPS_WP_SPR2_Flt',
// // 'SCL_HPRF:IGBT15:PPS_WP_SPR2_Flt',
// // 'SCL_HPRF:IGBT18:PPS_WP_SPR2_Flt',
// // 'SCL_HPRF:IGBT21:PPS_WP_SPR2_Flt',
// // 'SCL_Mag:MBOK:Sum.SEVR',
// // 'SCL_Mag:Mag_12_18_HBOK:Sum.SEVR',
// // 'SCL_Mag:Mag_19_23_HBOK:Sum.SEVR',
// // 'SCL_Mag:Mag_Drift_HBOK:Sum.SEVR',
// // 'SCL_RF:19_23_HBOK:Sum.SEVR',
// // 'SCL_RF:MBOK:Sum.SEVR',
// // 'SCL_RF:RF_12_18_HBOK:Sum.SEVR',
// // 'SCL_Vac:Vac_12_18_HBOK:Sum.SEVR',
// // 'SCL_Vac:Vac_19_23_HBOK:Sum.SEVR',
// // 'SCL_Vac:Vac_Drift_HBOK:Sum.SEVR',
// // 'SCL_Vac:Vac_MBOK:Sum.SEVR',
// // 'Src_Diag:BCM01:SparkCount6',
// // 'TGT_LWS2:Tnk_TE1710A:MinAvg',
// // 'TGT_LWS2:Tnk_TE1710D:MinAvg',
// // 'TGT_LWS2:Tnk_TE1710F:MinAvg',
// // 'TGT_LWS2:Tnk_TE1710G:MinAvg',
// // 'TGT_TPS:Pmp_YY5501A:Sts',
// // 'TGT_TPS:Pmp_YY5501B:Sts',
// // ];

// // let pvList2 = [
// // 'FE:Scope_1:Acq',
// // 'FE:Scope_1:AcqCmd',
// // 'FE:Scope_1:Auto',
// // 'FE:Scope_1:Ch1',
// // 'FE:Scope_1:Ch2',
// // 'FE:Scope_1:Ch3',
// // 'FE:Scope_1:Ch4',
// // 'FE:Scope_1:HPT',
// // 'FE:Scope_1:HSE',
// // 'FE:Scope_1:HSM',
// // 'FE:Scope_1:Onl',
// // 'FE:Scope_1:RMS2',
// // 'FE:Scope_1:RMS3',
// // 'FE:Scope_1:RMS4',
// // 'FE:Scope_1:RMS_Level',
// // 'FE:Scope_1:RefA',
// // 'FE:Scope_1:RefB',
// // 'FE:Scope_1:RefC',
// // 'FE:Scope_1:RefD',
// // 'FE:Scope_1:SMode',
// // 'FE:Scope_1:VP1',
// // 'FE:Scope_1:VP2',
// // 'FE:Scope_1:VP3',
// // 'FE:Scope_1:VP4',
// // 'FE:Scope_1:VSE1',
// // 'FE:Scope_1:VSE2',
// // 'FE:Scope_1:VSE3',
// // 'FE:Scope_1:VSE4',
// // 'FE:Scope_1:VSM1',
// // 'FE:Scope_1:VSM2',
// // 'FE:Scope_1:VSM3',
// // 'FE:Scope_1:VSM4',
// // 'FE_Ctl:IOC1:Time',
// // ];

// // let pvList3 = [
// //     'FE:Scope_1:Auto'
// // ];

// // setTimeout(() => {
// //     timeA = performance.now();
// //     console.log("A", timeA);
// //     for (let name of pvList2) {
// //         tcaMonitor(name);
// //     }
// //     // for (let ii = 1; ii < npv; ii++) {
// //     //     const name = "val" + ii.toString();
// //     //     tcaMonitor(name);
// //     // }
// // }, 3000);

// // const sendAllDataTimer = setInterval(() => {
// //     if (Object.keys(allData).length > 0) {
// //         sendAllData(allData);
// //         allData = {};
// //     }
// // }, 0.1 * 1000);


// // setTimeout(() => {
// //     console.log("Terminate program");
// //     context.terminate();
// //     clearInterval(sendAllDataTimer);
// // }, 225000 * 1000)
