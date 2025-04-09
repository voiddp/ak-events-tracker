import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    useTheme,
    useMediaQuery,
    Stack,
    Slide,
    IconButton,
    Button,
    Box,
    MenuItem,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    SelectChangeEvent,
    InputAdornment,
    Alert,
    Snackbar,
    DialogActions
} from '@mui/material';
import Grid from "@mui/material/Grid2";
import { ContentCopy, DragIndicator, FileUpload, InfoOutlined } from '@mui/icons-material';
import itemsJson from '../data/items.json';
import ItemBase from './ItemBase';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { TransitionProps } from '@mui/material/transitions';
import { EventsData, NamedEvent, SubmitEventProps } from '@/lib/events/types';
import InputIcon from '@mui/icons-material/Input';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from '@mui/icons-material/Delete';
import { Close } from "@mui/icons-material";
import { debounce, set } from 'lodash';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SubmitEventDialog from './SubmitEventDialog';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { MAX_SAFE_INTEGER, getWidthFromValue, formatNumber, getItemBaseStyling, isMaterial, getDefaultEventMaterials, standardItemsSort } from '@/utils/ItemUtils'
import { createEmptyEvent, createEmptyNamedEvent, reindexEvents } from "@/lib/events/utils"

import ItemEditBox from './ItemEditBox';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface Props {
    forceUpdate: boolean;
    forceUpdateCallback: (up: boolean) => void;
    open: boolean;
    onClose: () => void;
    eventsData: EventsData;
    onChange: (data: EventsData) => void;
    submitEvent: (submit: SubmitEventProps) => void,
    children?: React.ReactNode;
}

const EventsTrackerMain = React.memo((props: Props) => {
    const { forceUpdate, forceUpdateCallback, open, onClose, eventsData, onChange, submitEvent, children } = props;

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const [tab, setTab] = useState('input');
    const containerRef = useRef<HTMLElement>(null);

    const [rawEvents, setRawEvents] = useState<EventsData>({});
    const [rawName, setRawName] = useState<string>('');
    const [newEventNames, setNewEventNames] = useState<Record<string, string>>({});

    const [copiedSuccessfully, setCopiedSuccessfully] = useState(false);
    const [exportFormat, setExportFormat] = useState('');
    const [importFormat, setImportFormat] = useState('');
    const [exportData, setExportData] = useState('');
    const [importData, setImportData] = useState('');

    const [importFinished, setImportFinished] = useState(false);
    const [importErrored, setImportErrored] = useState(false);
    const [importMessage, setImportMessage] = useState("");

    const [expandedAccordtition, setExpandedAccordtition] = useState<string | false>(false);
    const [focusedId, setFocusedId] = useState<{ id: string, name: string } | null>(null);

    const [submitDialogOpen, setSubmitDialogOpen] = useState<boolean>(false);
    const [submitedEvent, setSubmitedEvent] = useState({ ...createEmptyNamedEvent() });

    const [selectedEvent, setSelectedEvent] = useState<NamedEvent>();
    const [submitVariant, setSubmitVariant] = useState<"tracker" | "months">("tracker");

    interface DataShareInfo {
        format: string;
        description: string;
    }

    const SUPPORTED_IMPORT_EXPORT_TYPES: DataShareInfo[] = [
        {
            format: "CSV",
            description: "A csv file containing 5 columns (,) divided with the following names: eventName, index, material_id, quantity, farms. Farms contains upto 3 id values (;) divided ",
        },
        {
            format: "JSON",
            description: `JSON example: { "eventName": { "index": orderNumber, "materials": { "id1": quantity, "id2": quantity }, "farms": ["id1", "id2"] } }`,
        },
    ];

    const HELP_INFORMATION =
        <>
            <p>
                The Event Tracker helps track free income from unreleased future events, including rewards, shops, and similar sources.
            </p>
            <ul>
                <li>Events can be added manually by creating a new event, expanding it, and entering material amounts.</li>
                <li>Up to three farmable Tier 3 materials per event can be selected by clicking on the item images within an expanded event.</li>
                <li>Events can be reordered by dragging and dropping them in the event list.</li>
            </ul>
            <h3>Event List Building:</h3>
            <ul>
                <li><big><b>Build from PRTS:</b></big> Event data from the past six months on prts.wiki is available for use.</li>
                <ul><li>Download buttons on individual event pages can retrieve or update income data for each event if needed.</li></ul>
                <ul><li>A global queue system with a 2-second delay is implemented in all download functions.</li></ul>
                <li><big><b>Add Months:</b></big> Income calendar calculation for ~six upcoming months, based on daily, weekly, and monthly rewards, can be added to the list.</li>
                <li>Data from prts pages and monthly event estimates can be added as new entries, replace existing events, or be merged with them.</li>
            </ul>

            <h3>Defaults and Updates:</h3>
            <ul>
                <li>The tracker automatically preloads and parses six months of event data from prts.wiki on a daily basis.</li>
                <li>Data from CN events, adjusted by six months, is combined with monthly estimates and sorted by date. These form the defaults used by the tracker.</li>
                <li>The default order can be used as-is or adjusted as global updates occur.</li>
            </ul>

            <h3>Export/Import and Krooster:</h3>
            <ul>
                <li>CSV and JSON formats are available for exporting data. Defaults can be used as examples.</li>
                <li><h3>Supports importing into the tracker in Krooster Planner, allowing integration with the Goals Summary feature to account for upcoming free rewards and Tier 3 farming plans.</h3></li>
            </ul>
        </>;

    useEffect(() => {
        if (forceUpdate) {
            setRawEvents(eventsData ?? {})
            forceUpdateCallback(false);
        }
    }, [forceUpdate, eventsData, forceUpdateCallback])

    useEffect(() => {
        if (open) {
            setRawEvents(eventsData ?? {});
        }
    }, [open])

    const handleToggleChange = (event: React.MouseEvent<HTMLElement>, nextTab: string) => {
        let toTab = nextTab;
        if (toTab === null) {
            switch (tab) {
                case "input": toTab = "importExport"
                    break;
                case "importExport": toTab = "help"
                    break;
                case "help": toTab = "input"
            }
        }
        cleanImportExport();
        setTab(toTab);
    };

    const resetEventsList = () => {
        onChange({});
        setRawEvents({});
    }

    const handleOnChange = () => {
        onChange(rawEvents);
    }

    const handleClose = () => {
        setTab('input');
        onChange(rawEvents);

        /* setRawEvents(eventsData ?? {});
        setRawName("");
        setExpandedAccordtition(false); */

        cleanImportExport();

        /* onClose(); */
    }

    //debounces handling
    //base function to debounce
    const handleEventNamesChange = () => {

        if (Object.keys(newEventNames).length === 0) return;

        setRawEvents((prev) => {
            const _next = { ...prev };
            Object.entries(newEventNames).forEach(([oldName, newName]) => {
                if (!newName.trim()) return;
                _next[newName] = { ..._next[oldName] };
                delete _next[oldName];
            });
            return _next;
        });
        setNewEventNames({});
    };

    //init ref with onChange
    const ref = useRef(handleEventNamesChange);

    //update ref on rawValues changes to see latest.
    useEffect(() => {
        ref.current = handleEventNamesChange;
    }, [newEventNames]);

    //creating debounced callback only once - on mount
    const debouncedEventNamesChange = useMemo(() => {
        const func = () => {
            ref.current?.(); //with access to latest onChange version from ref
        };
        return debounce(func, 1000);
    }, []);

    const handleEventNameChange = useCallback((oldName: string, newName: string) => {
        setNewEventNames(prev => ({ ...prev, [oldName]: newName }));
        debouncedEventNamesChange();
    }, [setNewEventNames, debouncedEventNamesChange]
    );

    const ref2 = useRef(handleOnChange);

    useEffect(() => {
        ref2.current = handleOnChange;
        debouncedOnChange();
    }, [rawEvents])

    const debouncedOnChange = useMemo(() => {
        const func = () => {
            ref2.current?.();
        };
        return debounce(func, 5000);
    }, []);

    const handleQuantityChange = (eventName: string, materialId: string, quantity: number) => {
        setRawEvents((prev) => {
            const _next = { ...prev };
            const _event = { ..._next[eventName] };
            if (quantity <= 0 || isNaN(quantity)) {
                delete _event.materials[materialId];
            } else {
                _event.materials[materialId] = Math.min(quantity, MAX_SAFE_INTEGER);
            }
            _next[eventName] = _event
            return _next;
        });
    };

    const handleIconClick = useCallback((eventName: string, id: string) => {
        if (!isMaterial(id, 3)) return;

        setRawEvents((prev) => {
            const _next = { ...prev };
            const _event = { ..._next[eventName] };
            const _farms = _event.farms ? [..._event.farms] : [];
            const index = _farms.indexOf(id);
            if (index === -1) {
                if (_farms.length >= 3) _farms.splice(0, 1);
                _farms.push(id);
            } else {
                _farms.splice(index, 1);
            };
            if (_farms.length === 0) {
                delete _event.farms
            } else {
                _event.farms = _farms;
            }
            _next[eventName] = _event;
            return _next
        })
    }, []
    );

    const handleDragEnd = useCallback((result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;

        const events = Object.entries(rawEvents).sort(
            ([, a], [, b]) => a.index - b.index
        );

        const [movedElement] = events.splice(source.index, 1);
        events.splice(destination.index, 0, movedElement);

        setRawEvents(reindexEvents(events));
    }, [rawEvents]
    );
    const addNewEvent = (name: string) => {
        const _name = name.trim();
        if (!_name) return;

        setRawEvents((prev) => {
            const _next = { ...prev ?? {} };
            const _newEvent = { ...createEmptyEvent() };
            _newEvent.index = Object.keys(_next).length
            _next[_name] = _newEvent;
            return _next;
        }
        );
        setRawName('');
    };

    const handleDeleteEvent = useCallback((name: string) => {
        setRawEvents((prev) => {
            const _next = { ...prev };
            delete _next[name];
            return reindexEvents(_next)
        });
    }, []
    );

    const handleSubmitEvent = useCallback((props: SubmitEventProps) => {

        if (submitVariant === "months") {
            submitEvent(props);
            return;
        }

        const { materialsToEvent } = props;

        if (!materialsToEvent) {
            handleDeleteEvent(submitedEvent.name);
        } else {
            setRawEvents((prev) => {
                const _next = { ...prev };
                if (submitedEvent.index >= 0)
                    _next[submitedEvent.name].materials = materialsToEvent;
                return _next;
            });
        }
        setSubmitedEvent({ ...createEmptyNamedEvent() });

    }, [submitVariant, submitedEvent, submitEvent, handleDeleteEvent, setRawEvents, setSubmitedEvent,]);

    const defaultEventMaterials = useMemo(() =>
        getDefaultEventMaterials(itemsJson),
        []
    );

    const memoizedDetails = useMemo(() => {
        return defaultEventMaterials.map((id) => (
            <ItemEditBox
                key={id}
                itemId={id}
                size={getItemBaseStyling("tracker").itemBaseSize}
                clickable={isMaterial(id, 3)}
            />
        ));
    }, [defaultEventMaterials]);

    const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedAccordtition(isExpanded ? panel : false);
        setFocusedId(null);
    };

    const renderEvent = useCallback((name: string, index: number) => {
        const _eventData = rawEvents[name] ? { ...rawEvents[name] } : undefined;
        if (!_eventData) return (null);

        return (
            <Accordion key={name} expanded={expandedAccordtition === name} onChange={handleAccordionChange(name)} sx={{
                borderTop: "4px solid",
                borderColor: "primary.main",
            }}>
                <AccordionSummary>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" width="stretch">
                        <Stack direction="row" alignItems="center" flexWrap="nowrap" flexGrow={1}>
                            <DragIndicator sx={{ mr: 1 }} onClick={(e) => e.stopPropagation()} />
                            <Stack direction="row" alignItems="center" flexWrap="wrap" flexGrow={1} justifyContent={{ xs: "center", md: "flex-start" }}>
                                <TextField size="small" value={newEventNames[name] ?? name}
                                    sx={{
                                        mr: 2,
                                        width: { md: getWidthFromValue(newEventNames[name] ?? name, '20ch'), xs: '100%' }
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onChange={(e) => handleEventNameChange(name, e.target.value)} />
                                {!_eventData.farms
                                    && Object.keys(_eventData.materials ?? {}).length === 0 &&
                                    <Typography pt={{ xs: 2, md: 0 }} variant='caption'>expand to add materials</Typography>
                                }
                                {(_eventData.farms ?? []).map((id) => [id, 0] as [string, number])
                                    .concat(Object.entries(_eventData.materials ?? {})
                                        .sort(([idA], [idB]) => standardItemsSort(idA, idB)))
                                    .map(([id, quantity], idx) => (
                                        <ItemBase key={`${id}${quantity === 0 && "-farm"}`} itemId={id} size={getItemBaseStyling("tracker").itemBaseSize}>
                                            <Typography {...getItemBaseStyling("tracker").numberCSS}>{quantity === 0 ? ["Ⅰ", "Ⅱ", "Ⅲ"][idx] : formatNumber(quantity)}</Typography>
                                        </ItemBase>
                                    ))}
                            </Stack>
                        </Stack>
                        <Stack direction="row" gap={2}>
                            {/* <Tooltip title="Select materials to add to depot">
                                <MoveToInboxIcon
                                    fontSize="large"
                                    sx={{
                                        transition: "opacity 0.1s",
                                        "&:focus, &:hover": {
                                            opacity: 0.5,
                                        },
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (Object.keys(_eventData.materials ?? {}).length === 0) return;
                                        setSubmitedEvent({ name, index: _eventData.index, materials: _eventData.materials ?? {}, farms: _eventData.farms ?? [] });
                                        setSubmitDialogOpen(true);
                                    }} />
                            </Tooltip> */}
                            <DeleteIcon
                                fontSize="large"
                                sx={{
                                    transition: "opacity 0.1s",
                                    "&:focus, &:hover": {
                                        opacity: 0.5,
                                    },
                                }}
                                onClick={() => handleDeleteEvent(name)} />
                        </Stack>
                    </Stack>
                </AccordionSummary>
                {expandedAccordtition === name && (
                    <AccordionDetails style={{ display: 'flex', gap: 8 }}>
                        <Stack direction="row" style={{ width: '100%', flexWrap: 'wrap', gap: 8 }}>
                            {memoizedDetails.map((element) => {/*cloning existing elements for speed*/
                                const id = element.props.itemId;
                                if (!id) return null;
                                const isFocused = focusedId?.id === id && focusedId?.name === name;
                                const _value = _eventData.materials[id]
                                    ? (!isFocused ? formatNumber(_eventData.materials[id]) : _eventData.materials[id])
                                    : "";
                                const _width = getWidthFromValue(_value, '4ch');
                                return React.cloneElement(element, {
                                    value: _value,
                                    width: _width,
                                    isFocused: isFocused,
                                    onChange: (value: number) => handleQuantityChange(name, id, value),
                                    highlighted: _eventData.farms?.includes(id),
                                    onIconClick: () => handleIconClick(name, id),
                                    onFocus: () => setFocusedId({ id, name }),
                                });
                            })}
                        </Stack>
                    </AccordionDetails>
                )}
            </Accordion>
        )
    }, [rawEvents, newEventNames, expandedAccordtition, memoizedDetails, focusedId, setFocusedId,
        handleDeleteEvent, handleIconClick, handleEventNameChange]
    )
    const renderedEvents = useMemo(() => {
        return (
            <>
                {Object.keys(rawEvents).length > 0 ? (/* Render events list */
                    <Box sx={{ width: "100%" }}>
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="events">
                                {(provided) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ overflow: 'visible' }}>
                                        {Object.entries((rawEvents))
                                            .sort(([, aData], [, bData]) => aData.index - bData.index)
                                            .map(([groupName, data], index) => (
                                                <React.Fragment key={groupName}>
                                                    <Draggable key={groupName} draggableId={groupName} index={index}>
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                            >
                                                                {renderEvent(groupName, data.index)}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                </React.Fragment>
                                            ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </Box>
                ) : null}
            </>
        )
    }, [rawEvents, handleDragEnd, renderEvent]
    );

    const cleanImportExport = () => {
        setExportData("");
        setExportFormat("");
        setImportFormat("");
        setImportData("");
    }

    const importExportFormatOptions = () => {
        return SUPPORTED_IMPORT_EXPORT_TYPES.flatMap((x) => (
            <MenuItem key={x.format} value={x.format}>
                <Stack direction="row" alignItems="center" gap={1}>
                    {x.format}
                    <Tooltip title={x.description}>
                        <InfoOutlined />
                    </Tooltip>
                </Stack>
            </MenuItem>
        ));
    };

    // Handle Export
    const handleExportFormatChange = (e: SelectChangeEvent) => {
        const selectedFormat = e.target.value;
        setExportFormat(selectedFormat);
        let result = "";

        switch (selectedFormat) {
            case 'JSON':
                result = JSON.stringify(rawEvents, null, 2);
                break;
            case 'CSV':
                const csv = Object.entries(rawEvents)
                    .flatMap(([name, eventData]) => {
                        const materialRows = Object.entries(eventData.materials).map(([material_id, quantity]) =>
                            `${name},${eventData.index},${material_id},${quantity},${(eventData.farms ?? []).join(';')}`
                        );
                        const farmRows = (eventData.farms ?? []).length > 0 && Object.keys(eventData.materials).length === 0
                            ? [`${name},${eventData.index},,,${eventData.farms?.join(';')}`]
                            : [];
                        return [...materialRows, ...farmRows];
                    })
                    .join('\n');
                result = `eventName,index,material_id,quantity,farms\n${csv}`;
                break;
        }
        setExportData(result);
    };

    const handleImportFormatChange = (e: SelectChangeEvent) => {
        const selectedFormat = e.target.value;
        setImportFormat(selectedFormat);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(exportData).then();
        setCopiedSuccessfully(true);
    };

    // Handle Import
    const handleImport = () => {
        try {
            let newData: EventsData = {};

            if (importFormat === 'JSON') {
                newData = JSON.parse(importData);
            } else {
                const lines = importData.split('\n').slice(1);
                lines.forEach(line => {
                    const [name, index, material_id, quantity, farms] = line.split(',');
                    if (!newData[name]) newData[name] = { index: Number(index), materials: {}, farms: [] };
                    if (material_id) {
                        newData[name].materials[material_id] = Math.min(Number(quantity), MAX_SAFE_INTEGER);
                    }
                    if (farms) {
                        newData[name].farms = farms.split(';');
                    }
                });
            };
            //remove trash data not from itemsJson
            const reindexedData = reindexEvents(
                Object.entries(newData)
                    .filter(([, eData]) => {
                        //no mats event can exist
                        if (Object.keys(eData.materials).length === 0) return true;
                        //but all mats have to exist
                        return Object.entries(eData.materials)
                            .every(([id]) => (id in itemsJson))
                    })
                    .sort(([, eDataA], [, eDataB]) => (eDataA.index ?? 0) - (eDataB.index ?? 0)));

            setRawEvents(reindexedData);
            setImportMessage('Import successful');
            setImportErrored(false);
            setImportFinished(true);
        } catch (e) {
            setImportMessage('Error: Invalid import data');
            setImportErrored(true);
            setImportFinished(true);
        }
    };

    return (
        <>
            <Box sx={{ width: "100%", padding: 2, height: "inherit" }}>
                {/* Top Section */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={1}>
                    <Stack direction="row" alignItems="baseline" gap={3}>
                        <ToggleButtonGroup
                            orientation="horizontal"
                            value={tab}
                            exclusive
                            onChange={(_, value) => value && setTab(value)}
                            aria-label="toggle-tab"
                        >
                            <ToggleButton value="input" aria-label="input">
                                <InputIcon />
                            </ToggleButton>
                            <ToggleButton value="importExport" aria-label="importExport">
                                <ImportExportIcon />
                            </ToggleButton>
                            <ToggleButton value="help" aria-label="help">
                                <QuestionMarkIcon />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        {!fullScreen && <Box component="h3">
                            {(tab === "input") && (!fullScreen ? "Events" : "Events")}
                            {(tab === "importExport") && "Import/Export"}
                            {(tab === "help") && "Description"}
                        </Box>}
                    </Stack>
                    <Stack direction="row">
                        <Stack direction="row" gap={2} ml={2}>
                            <TextField
                                size="small"
                                label="New Event Name"
                                value={rawName}
                                onChange={(e) => setRawName(e.target.value)}
                            />
                            <Button
                                size={fullScreen ? 'small' : "medium"}
                                startIcon={<AddIcon />}
                                variant="contained"
                                color="primary"
                                disabled={rawName.length === 0}
                                onClick={() => addNewEvent(rawName.trim())}
                            >
                                {!fullScreen && "New Event"}
                            </Button>
                        </Stack>
                    </Stack>
                    {/* <IconButton>
              <CloseIcon />
            </IconButton> */}
                </Stack>
                {/* Content Section */}
                <Box sx={{ /* height: "85vh", */ /* { sm: "500px", xl: "700px" } ,*/ /* overflowY: "auto" */ }}>
                    {/* Input Tab */}
                    {tab === "input" && (
                        <Stack direction="column" justifyContent="center" alignItems="center">
                            {!rawEvents || Object.keys(rawEvents).length === 0 && (
                                <>
                                    {children}
                                </>
                            )}
                            {renderedEvents}
                        </Stack>
                    )}

                    {/* Import/Export Tab */}
                    {tab === "importExport" && (
                        <Grid container spacing={2} mt={1} mb={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="export-format-label">Export format</InputLabel>
                                    <Select
                                        id="export-format"
                                        variant="standard"
                                        name="export-format"
                                        labelId="export-format-label"
                                        label="Export format"
                                        value={exportFormat}
                                        MenuProps={{
                                            anchorOrigin: {
                                                vertical: "bottom",
                                                horizontal: "left",
                                            },
                                            transformOrigin: {
                                                vertical: "top",
                                                horizontal: "left",
                                            },
                                            sx: { "& .MuiList-root": { mr: "25px", width: "100%" } },
                                        }}
                                        onChange={handleExportFormatChange}
                                    >
                                        {importExportFormatOptions()}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 8, md: 4 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="import-format-label">Import format</InputLabel>
                                    <Select
                                        id="import-format"
                                        variant="standard"
                                        name="import-format"
                                        labelId="import-format-label"
                                        label="import format"
                                        value={importFormat}
                                        MenuProps={{
                                            anchorOrigin: {
                                                vertical: "bottom",
                                                horizontal: "left",
                                            },
                                            transformOrigin: {
                                                vertical: "top",
                                                horizontal: "left",
                                            },
                                            sx: { "& .MuiList-root": { mr: "25px", width: "100%" } },
                                        }}
                                        onChange={handleImportFormatChange}
                                    >
                                        {importExportFormatOptions()}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 4, md: 2 }}>
                                <Tooltip title="Importing data OVERRIDE the current one">
                                    <span>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            aria-label="Import data"
                                            startIcon={<FileUpload />}
                                            disabled={importData == ""}
                                            onClick={handleImport}
                                            sx={{ lineHeight: "1.3" }}
                                        >
                                            Import data
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={10}
                                    maxRows={10}
                                    id="exported-data-input"
                                    label="Export data"
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                            endAdornment: (
                                                <InputAdornment position="end" sx={{ alignItems: "flex-end" }}>
                                                    <Tooltip title="Copy">
                                                        <span>
                                                            <IconButton
                                                                aria-label="Copy exported data"
                                                                onClick={copyToClipboard}
                                                                edge="end"
                                                                sx={{ mr: 0.1 }}
                                                                disabled={exportData == ""}
                                                            >
                                                                <ContentCopy />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </InputAdornment>
                                            ),
                                            sx: { alignItems: "flex-end" },
                                        },
                                    }}
                                    value={exportData}
                                ></TextField>
                            </Grid>
                            <Grid display="flex" justifyContent="center" alignItems="center" size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={10}
                                    maxRows={10}
                                    id="import-data-input"
                                    label="Import data"
                                    value={importData}
                                    disabled={importFormat == ""}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                        setImportData(event.target.value);
                                    }}
                                ></TextField>
                            </Grid>
                        </Grid>
                    )}

                    {/* Help Tab */}
                    {tab === "help" && <Box>{HELP_INFORMATION}</Box>}
                </Box>

                {/* Bottom Section */}
                {/* <Stack direction="row" justifyContent="space-between" gap={2} mt={2}>
                    <Stack direction="row" justifyContent="flex-start" gap={2}>
                        {<Button onClick={() => {
                        handleClose();
                        openSummary(true);
                    }}
                        variant="contained"
                        color="primary">
                        Open Summary
                    </Button>}

                        {children}
                    </Stack>
                </Stack> */}
            </Box>
            <Snackbar
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                open={copiedSuccessfully}
                autoHideDuration={1500}
                onClose={() => setCopiedSuccessfully(false)}
            >
                <Alert variant="filled" severity="success" onClose={() => setCopiedSuccessfully(false)}>
                    Copied to clipboard
                </Alert>
            </Snackbar>
            <Snackbar
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                open={importFinished}
                autoHideDuration={1500}
                onClose={() => setImportFinished(false)}
            >
                <Alert variant="filled" severity={importErrored ? "error" : "success"} onClose={() => setImportFinished(false)}>
                    {importMessage}
                </Alert>
            </Snackbar>
            <SubmitEventDialog
                open={submitDialogOpen}
                onClose={() => {
                    setSubmitDialogOpen(false)
                    setSubmitVariant('tracker');
                }}
                variant={submitVariant}
                onSubmit={handleSubmitEvent}
                submitedEvent={submitedEvent}
                eventsData={eventsData}
                selectedEvent={selectedEvent}
                onSelectorChange={setSelectedEvent}
            />
        </>
    );
});

EventsTrackerMain.displayName = "EventsTrackerMain";
export default EventsTrackerMain;
