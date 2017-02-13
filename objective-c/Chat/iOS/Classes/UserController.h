// **********************************************************************
//
// Copyright (c) 2003-2017 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

#import <UIKit/UIKit.h>

@interface UserController : UITableViewController
{
    IBOutlet UITableView* usersTableView;
    NSMutableArray* users;
}

@property (nonatomic) UITableView* usersTableView;
@property (nonatomic) NSMutableArray* users;

@end
