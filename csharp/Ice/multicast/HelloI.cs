// **********************************************************************
//
// Copyright (c) 2003-2017 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

using Demo;

public class HelloI : HelloDisp_
{
    public override void
    sayHello(Ice.Current current)
    {
        System.Console.Out.WriteLine("Hello World!");
    }
}
