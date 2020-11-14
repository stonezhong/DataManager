import React from 'react'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Modal from 'react-bootstrap/Modal'

import * as Icon from 'react-bootstrap-icons'

class LoaderViewer extends React.Component {
    state = {
        show: false,
        loader: "{}",
    };

    onClose = () => {
        this.setState({show: false});
    };

    openDialog = (loader) => {
        this.setState({
            show: true,
            loader: loader
        })
    };

    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='lg'
                scrollable
            >
                <Modal.Header closeButton>
                    <Modal.Title>Loader</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <pre>
                            {JSON.stringify(JSON.parse(this.state.loader),null,2)}
                        </pre>
                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={this.onClose}
                    >
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

/*********************************************************************************
 * Purpose: Show list of dataset instances
 * TODO: pagination
 *
 * Props
 *     dataset               : the dataset object
 *     dataset_instances     : a list of dataset instances
 *
 */
export class DatasetInstanceTable extends React.Component {
    theLoaderViewerRef = React.createRef();

    render() {
        return (
            <Row>
                <Col>
                    <h1>Assets</h1>
                    <Table>
                        <thead className="thead-dark">
                            <tr>
                                <th>Name</th>
                                <th>Data Time</th>
                                <th>Publish Time</th>
                                <th>Loader</th>
                                <th>Row Count</th>
                                <th>Locations</th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.dataset_instances.map((dataset_instance) => {
                                return (
                                    <tr key={dataset_instance.id}>
                                        <td>{dataset_instance.name}</td>
                                        <td>{dataset_instance.date_time}</td>
                                        <td>{dataset_instance.publish_time}</td>
                                        <td>
                                            {
                                                dataset_instance.loader && <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={event => {
                                                        this.theLoaderViewerRef.current.openDialog(
                                                            dataset_instance.loader
                                                        );
                                                    }}
                                                >
                                                    <Icon.Info />
                                                </Button>
                                            }
                                        </td>
                                        <td>{dataset_instance.row_count}</td>
                                        <td>

                                        <Table size="sm" borderless className="c-location-table">
                                            <tbody>
                                                {dataset_instance.locations.map((location)=>{
                                                    return (
                                                        <tr key={location.offset}>
                                                            <td><small><code>{location.type}</code></small></td>
                                                            <td><small><code>{location.location}</code></small></td>
                                                            <td><small><code>{location.size}</code></small></td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </Table>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </Table>
                    <LoaderViewer ref={this.theLoaderViewerRef}/>
                </Col>
            </Row>
        )
    }
}
