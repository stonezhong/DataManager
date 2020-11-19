import React from 'react'

import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'

import {SchemaViewer} from './schema_viewer.jsx'

export class TestSchemaViewer extends React.Component {
    theSchemaViewerRef = React.createRef();

    testSchema = {
        "type": "struct",
        "fields": [
            {
                "name": "market",
                "type": "string",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "type",
                "type": "string",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "symbol",
                "type": "string",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "amount",
                "type": "long",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "price",
                "type": "double",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "commission",
                "type": "double",
                "nullable": true,
                "metadata": {}
            }
        ]
    };

    render() {
        return (
            <Container fluid>
                <h2>Test SchemaViewer</h2>
                <SchemaViewer
                    ref={this.theSchemaViewerRef}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.theSchemaViewerRef.current.openDialog(this.testSchema);
                    }}
                >
                    New Dataset
                </Button>
            </Container>
        );
    }
}
